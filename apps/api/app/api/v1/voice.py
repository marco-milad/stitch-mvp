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
- Speak in warm Egyptian Arabic. Sound like a helpful concierge, not a robot.
- Use "أهلا" not "مرحبا", "تمام" not "حسنًا", "تحب" not "هل ترغب",
  "عايز/ة" not "أريد", "دلوقتي" not "الآن".
- ALL numbers and prices in formal Arabic words. Round to nearest whole number.
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
**Role:** You are Farah (فرح), the AI voice concierge for the Stitch
community. You help residents with maintenance, guest access, facilities,
payments, and community information.

**Opening:** "أهلا بيك! أنا فرح، المساعدة الذكية بتاعت الكمبوند. أقدر أساعدك في ايه انهاردة؟"

**Flow:** Listen, ask the right questions step by step, recap and confirm,
then confirm naturally.

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


def _resolve_prompt(context: str, user_name: str | None) -> str:
    base = SERVICE_PROMPTS.get(context, SERVICE_PROMPTS["general"])
    if not user_name:
        return base
    first_name = user_name.split()[0]
    header = (
        "**Resident context (known — do NOT ask for these):**\n"
        f"- First name: {first_name}\n"
        f"- Preferred language: {settings.GEMINI_LANGUAGE}\n\n"
        "**Personalization rules:**\n"
        "- Greet the resident by their first name.\n"
        "- Do not ask for their name, unit number, or role.\n\n"
    )
    return header + base


@router.websocket("/voice")
async def voice_websocket(websocket: WebSocket) -> None:
    await websocket.accept()

    qp = websocket.query_params
    context = qp.get("context") or "general"
    user_name = qp.get("user_name") or None

    system_prompt = _resolve_prompt(context, user_name)
    voice_name = settings.GEMINI_VOICE_NAME

    logger.info(
        "voice.session.open",
        context=context,
        voice=voice_name,
        user=user_name or "(anonymous)",
    )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    live_config = types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=system_prompt,
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice_name)
            )
        ),
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

            async def forward_gemini_to_client() -> None:
                nonlocal running
                try:
                    while running:
                        async for response in session.receive():
                            if not running:
                                break
                            if response.data:
                                audio_b64 = base64.b64encode(response.data).decode("utf-8")
                                await websocket.send_json(
                                    {
                                        "type": "audio",
                                        "data": audio_b64,
                                        "sampleRate": OUTPUT_SAMPLE_RATE,
                                    }
                                )
                            if response.server_content and response.server_content.turn_complete:
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
                        await session.send_realtime_input(
                            audio=types.Blob(
                                data=audio_bytes,
                                mime_type=f"audio/pcm;rate={INPUT_SAMPLE_RATE}",
                            )
                        )
                    elif msg_type == "text":
                        text = data.get("text", "")
                        if text:
                            await session.send(input=text, end_of_turn=True)
                    elif msg_type == "end":
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
