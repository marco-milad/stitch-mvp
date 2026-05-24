"""Voice WebSocket — bridges browser audio to Google Gemini Live.

Migrated from the prototype's Quart-based `server.py`. The Quart→FastAPI port
is largely a 1:1 rename: both expose `accept`, `send_json`, `receive_json` on
the WebSocket object. Query params come from `websocket.query_params` instead
of Quart's `websocket.args`.

Scope for Week 1 per the build plan: connection + audio streaming + reconnect-
friendly events. NO tool-calling and NO conversation persistence yet — those
land in Week 2 alongside the conversations/messages tables.
"""

import asyncio
import base64
from contextlib import suppress

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.logging import logger

router = APIRouter()

INPUT_SAMPLE_RATE = 16000
OUTPUT_SAMPLE_RATE = 24000

_BASE_STYLE = """
**Language & Style**
- Match the resident's language. Speak Egyptian Arabic when they use Arabic;
  speak natural conversational English when they use English. Never mix
  unless they do.
- In Arabic: use "أهلا" not "مرحبا", "تمام" not "حسنًا", "تحب" not "هل ترغب",
  "عايز/ة" not "أريد", "دلوقتي" not "الآن". Numbers and prices in formal
  Arabic words, rounded to nearest whole number.
- In English: keep it warm and concise, like a helpful concierge — not a
  robot, not corporate.
- Be concise — short sentences, no long lists.

**Confirmation Rule**
Before confirming any request, ALWAYS recap and wait for confirmation:
"تمام، خليني أتأكد: [summary]. صح كده؟"
Only proceed after: "أيوه", "تمام", "صح".

**After Confirmation**
Once the resident confirms, just say the request is done. Example: "حاضر، خلاص اتسجل!"
NEVER mention any ticket number, reference number, booking ID, or any code.

**Closing**
After completing: ask "فيه حاجة تانية؟"
If no → "شكرًا! لو محتاجة أي حاجة تاني، أنا موجودة. يوم سعيد!"

**Important**
- NEVER mention ticket numbers, reference numbers, booking IDs, or any codes.
- Do NOT mention tools, systems, APIs, or technical details.
- Just respond naturally and confirm requests warmly.
"""

# Compact per-service prompt set. The prototype has more contexts (payments,
# appointments, gatenotify, complaints, outlets, contactus, homeservices);
# those move into a dedicated module in Week 2 along with conversation
# persistence. For Week 1 the four most-used contexts are enough.
SERVICE_PROMPTS: dict[str, str] = {
    "general": f"""
**Role:** You are Farah (فرح), the AI concierge for residents of **Madinet
Masr** — a premium gated community east of New Cairo. You help with
maintenance, guest access, gate passes, facility bookings (gym/spa/yoga
classes), parking, smart-home controls, services (cleaning/laundry/delivery/
pet/gardening/security), payments, and community events.

**Opening (Arabic):** "أهلا بيك! أنا فرح، المساعدة الذكية بتاعت مدينة مصر. أقدر أساعدك في ايه؟"
**Opening (English):** "Hi! I'm Farah — your Madinet Masr assistant. How can I help?"

**Compound context (you already know — never ask):**
- Compound name: Madinet Masr (مدينة مصر)
- Pool hours: 6 AM – 10 PM (adult); 9 AM – 7 PM (kids)
- Main Gate: 24/7 with ANPR; North Gate: residents-only 6 AM – 11 PM
- Outlets Plaza, Cafés Row, Pharmacy (24/7), Supermarket (7 AM – 11 PM)
- Friday Night Bazaar at the Outlets Plaza, 6–11 PM
- Wellness Lab (gym + spa): open Tue–Sun
- Maintenance fees due on the 15th of each month

**Flow:** Listen, ask only the questions you actually need, recap concisely,
confirm naturally.

{_BASE_STYLE}
""",
    "maintenance": f"""
**Role:** You are Farah (فرح). The resident tapped "Maintenance Request".

**Opening:** "أهلا! محتاج/ة صيانة؟ قوليلي المشكلة ايه وهنبعتلك حد."

**Flow:**
1. Ask what needs fixing (AC, plumbing, electrical, paint, etc.)
2. Ask which unit/villa and room
3. Ask urgency: routine or urgent
4. Ask preferred time slot
5. Recap all details and wait for confirmation
6. Once confirmed: "تم، هنتواصل معاكي لتأكيد الموعد!"

{_BASE_STYLE}
""",
    "guest": f"""
**Role:** You are Farah (فرح). The resident tapped "Guest & Visitor Access".

**Opening:** "أهلا! عايز/ة تسجل/ي زائر؟ قوليلي التفاصيل وهنعملك QR pass."

**Flow:**
1. Ask guest name
2. Ask visit date
3. Recap and wait for confirmation
4. Once confirmed: "تم التسجيل! هنبعتلك QR code تبعتيه للزائر."

{_BASE_STYLE}
""",
    "facilities": f"""
**Role:** You are Farah (فرح). The resident tapped "Book Facility".

**Opening:** "أهلا! عندنا كلوب هاوس، ملاعب، meeting rooms، وحمام سباحة. عايز/ة تحجز/ي ايه؟"

**Flow:**
1. Ask which facility
2. Ask date and time
3. Ask number of guests
4. Recap and confirm
5. Once confirmed: "تم الحجز! هنبعتلك تأكيد على الأبليكيشن."

{_BASE_STYLE}
""",
}


def _resolve_prompt(
    context: str,
    user_name: str | None,
    unit_name: str | None = None,
) -> str:
    base = SERVICE_PROMPTS.get(context, SERVICE_PROMPTS["general"])
    if not user_name and not unit_name:
        return base

    lines: list[str] = ["**Resident context (known — do NOT ask for these):**"]
    if user_name:
        first_name = user_name.split()[0]
        lines.append(f"- First name: {first_name}")
    if unit_name:
        lines.append(f"- Unit: {unit_name} at Madinet Masr")
    lines.append(f"- Preferred language: {settings.GEMINI_LANGUAGE}")
    lines.append("")
    lines.append("**Personalization rules:**")
    if user_name:
        lines.append("- Greet the resident by their first name.")
    lines.append("- Do not ask for their name, unit number, or role.")
    lines.append("")
    return "\n".join(lines) + base


@router.websocket("/voice")
async def voice_websocket(websocket: WebSocket) -> None:
    await websocket.accept()

    qp = websocket.query_params
    context = qp.get("context") or "general"
    user_name = qp.get("user_name") or None
    unit_name = qp.get("unit_name") or None
    property_id = qp.get("property_id") or None

    system_prompt = _resolve_prompt(context, user_name, unit_name)
    voice_name = settings.GEMINI_VOICE_NAME

    logger.info(
        "voice.session.open",
        context=context,
        voice=voice_name,
        user=user_name or "(anonymous)",
        unit=unit_name or "(none)",
        property_id=property_id or "(none)",
    )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Enable bidirectional transcription so the frontend can stream the
    # user's spoken words + Farah's spoken reply into chat bubbles in real
    # time. Guarded for older google-genai SDKs that may not expose
    # `AudioTranscriptionConfig` yet.
    try:
        input_transcription: types.AudioTranscriptionConfig | None = (
            types.AudioTranscriptionConfig()
        )
        output_transcription: types.AudioTranscriptionConfig | None = (
            types.AudioTranscriptionConfig()
        )
    except AttributeError:
        logger.warning("voice.transcription.unsupported_sdk")
        input_transcription = None
        output_transcription = None

    live_config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        system_instruction=system_prompt,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
        input_audio_transcription=input_transcription,
        output_audio_transcription=output_transcription,
    )

    running = True

    try:
        async with client.aio.live.connect(
            model=settings.GEMINI_MODEL, config=live_config
        ) as session:
            await websocket.send_json(
                {
                    "type": "connected",
                    "message": "Voice session ready",
                    "voice": voice_name,
                    "context": context,
                    "sampleRate": OUTPUT_SAMPLE_RATE,
                }
            )

            inbound_chunks = 0  # count of audio chunks received from Gemini
            outbound_chunks = 0  # count of audio chunks sent to Gemini

            async def forward_gemini_to_client() -> None:
                nonlocal running, inbound_chunks
                first_audio_logged = False
                first_text_logged = False
                try:
                    while running:
                        async for response in session.receive():
                            if not running:
                                break
                            if response.data:
                                inbound_chunks += 1
                                if not first_audio_logged:
                                    logger.info(
                                        "voice.gemini.first_audio",
                                        bytes=len(response.data),
                                    )
                                    first_audio_logged = True
                                audio_b64 = base64.b64encode(response.data).decode("utf-8")
                                await websocket.send_json(
                                    {
                                        "type": "audio",
                                        "data": audio_b64,
                                        "sampleRate": OUTPUT_SAMPLE_RATE,
                                    }
                                )
                            # Some response shapes carry plain `text` as a top-level
                            # field alongside `data` (the warning in our log about
                            # 'text' + 'thought' parts). Forward it as an extra
                            # text-out delta so the bubble doesn't go silent if
                            # transcription is empty for this turn.
                            raw_text = getattr(response, "text", None)
                            if isinstance(raw_text, str) and raw_text:
                                if not first_text_logged:
                                    logger.info(
                                        "voice.gemini.first_text",
                                        chars=len(raw_text),
                                    )
                                    first_text_logged = True
                                await websocket.send_json({"type": "text-out", "delta": raw_text})
                            sc = response.server_content
                            if sc:
                                # User's speech transcribed (when input_audio_transcription enabled)
                                user_t = getattr(sc, "input_transcription", None)
                                if user_t and getattr(user_t, "text", None):
                                    await websocket.send_json(
                                        {"type": "text-in", "delta": user_t.text}
                                    )
                                # Farah's speech transcribed (when output_audio_transcription enabled)
                                farah_t = getattr(sc, "output_transcription", None)
                                if farah_t and getattr(farah_t, "text", None):
                                    await websocket.send_json(
                                        {"type": "text-out", "delta": farah_t.text}
                                    )
                                # User barged-in mid-response — Gemini stopped its
                                # audio output. Tell the client to flush its
                                # playback queue so Farah goes silent immediately.
                                if getattr(sc, "interrupted", False):
                                    await websocket.send_json({"type": "interrupted"})
                                if sc.turn_complete:
                                    await websocket.send_json({"type": "turn_complete"})
                except asyncio.CancelledError:
                    raise
                except Exception as exc:
                    if running:
                        logger.error("voice.gemini.receive_error", error=str(exc))
                        with suppress(Exception):
                            await websocket.send_json({"type": "error", "message": str(exc)})

            receive_task = asyncio.create_task(forward_gemini_to_client())

            try:
                while running:
                    try:
                        data = await asyncio.wait_for(websocket.receive_json(), timeout=0.25)
                    except TimeoutError:
                        continue
                    except WebSocketDisconnect:
                        running = False
                        break

                    msg_type = data.get("type")
                    if msg_type == "audio":
                        audio_bytes = base64.b64decode(data["data"])
                        outbound_chunks += 1
                        if outbound_chunks == 1:
                            logger.info(
                                "voice.client.first_audio",
                                bytes=len(audio_bytes),
                                mime=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                            )
                        elif outbound_chunks % 50 == 0:
                            logger.info(
                                "voice.client.audio_progress",
                                chunks=outbound_chunks,
                                gemini_response_chunks=inbound_chunks,
                            )
                        try:
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=audio_bytes,
                                    mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                                )
                            )
                        except Exception as exc:
                            logger.error(
                                "voice.gemini.send_error",
                                error=str(exc),
                                error_type=type(exc).__name__,
                                chunk_num=outbound_chunks,
                            )
                            raise
                    elif msg_type == "text":
                        text = data.get("text", "")
                        if text:
                            logger.info("voice.client.text", chars=len(text))
                            await session.send(input=text, end_of_turn=True)
                    elif msg_type == "end":
                        logger.info(
                            "voice.client.end",
                            chunks_sent=outbound_chunks,
                            chunks_received=inbound_chunks,
                        )
                        running = False
                        break
            finally:
                running = False
                receive_task.cancel()
                with suppress(asyncio.CancelledError):
                    await receive_task

    except WebSocketDisconnect:
        logger.info("voice.session.disconnect", context=context)
    except Exception as exc:
        logger.error("voice.session.error", error=str(exc), context=context)
        with suppress(Exception):
            await websocket.send_json({"type": "error", "message": str(exc)})
    finally:
        logger.info("voice.session.close", context=context)
