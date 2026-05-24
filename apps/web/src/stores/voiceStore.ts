// Voice assistant store — owns conversation state primitives plus the
// real-time WebSocket pipeline to our FastAPI/Gemini-Live bridge. The
// screen orchestrates the higher-level state machine and routes user
// actions to either the WS pipeline (when `connection === 'connected'`)
// or its own scripted mock pipeline (when offline).
//
// IMPORTANT: do NOT call `.filter()` / `.map()` inside a Zustand selector
// — returns a fresh reference every render and triggers an infinite loop
// (see [[feedback-zustand-selectors]]). Select raw, derive at consumer.

import { create } from 'zustand';

import { createAudioPlayer, type AudioPlayer } from '@/lib/audio/player';
import { createAudioRecorder, type AudioRecorder } from '@/lib/audio/recorder';
import { FALLBACK_REPLY_KEY, KEYWORD_REPLIES } from '@/lib/mock/voicePrompts';
import type { VoiceMessage, VoiceMode, VoiceState } from '@/lib/schemas/voice';
import {
  buildVoiceUrl,
  createVoiceSocket,
  type ServerFrame,
  type VoiceSocket,
} from '@/lib/voice/socket';

const CONNECT_TIMEOUT_MS = 5000;

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'offline';

interface VoiceStoreState {
  state: VoiceState;
  mode: VoiceMode;
  connection: ConnectionState;
  messages: VoiceMessage[];
  partial: string;
  utteranceIndex: number;

  // Shared primitives — used by both the real pipeline (via the actions
  // below) and the mock pipeline (driven from the screen).
  setState: (s: VoiceState) => void;
  setMode: (m: VoiceMode) => void;
  setConnection: (c: ConnectionState) => void;
  setPartial: (p: string) => void;
  advanceUtteranceIndex: () => void;
  commitUserMessage: (text: string, source: VoiceMessage['source']) => void;
  appendFarahReply: (text: string) => void;
  clearConversation: () => void;
}

function genId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  state: 'idle',
  mode: 'voice',
  connection: 'idle',
  messages: [],
  partial: '',
  utteranceIndex: 0,

  setState: (s) => set({ state: s }),
  setMode: (m) => set({ mode: m }),
  setConnection: (c) => set({ connection: c }),
  setPartial: (p) => set({ partial: p }),
  advanceUtteranceIndex: () =>
    set((s) => ({ utteranceIndex: (s.utteranceIndex + 1) % Number.MAX_SAFE_INTEGER })),

  commitUserMessage: (text, source) => {
    const msg: VoiceMessage = {
      id: genId(),
      role: 'user',
      text,
      source,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg], partial: '' }));
  },

  appendFarahReply: (text) => {
    const msg: VoiceMessage = {
      id: genId(),
      role: 'farah',
      text,
      source: 'voice',
      createdAt: new Date().toISOString(),
    };
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  clearConversation: () => set({ messages: [], partial: '', state: 'idle' }),
}));

/** Keyword-matched mock reply — used by the screen's offline fallback. */
export function resolveReplyKey(userText: string): string {
  const lower = userText.toLowerCase();
  for (const entry of KEYWORD_REPLIES) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return entry.replyKey;
    }
  }
  return FALLBACK_REPLY_KEY;
}

// ─── Module-scope runtime singletons ─────────────────────────────────────
// Kept outside Zustand because the WS / AudioContext lifecycles are
// orthogonal to React state.

let socket: VoiceSocket | null = null;
let recorder: AudioRecorder | null = null;
let player: AudioPlayer | null = null;
let streamingFarahId: string | null = null;
/** Dedup concurrent connectVoice() calls — React 18 StrictMode dev-mode
 *  fires useEffect twice on mount, and both calls would otherwise create
 *  separate sockets while waiting on the same WS handshake. */
let connectInFlight: Promise<void> | null = null;

function ensurePlayer(): AudioPlayer {
  if (!player) player = createAudioPlayer();
  return player;
}

function tearDownAudio(): void {
  recorder?.stop();
  player?.close();
  recorder = null;
  player = null;
  streamingFarahId = null;
}

// ─── Server frame handler ───────────────────────────────────────────────
//
// Continuous-conversation model: the mic stays open after the user taps it
// once, and Gemini Live's server-side VAD drives turn-taking. We only fall
// back to `idle` when the user explicitly ends the session (taps mic again
// or switches to text mode); `turn_complete` returns us to `listening`,
// not idle. Farah's audio is interruptible — when Gemini signals
// `interrupted`, we flush the playback queue so she shuts up immediately.

/** Commit any pending user STT partial as a finalized user bubble. Called
 *  on turn boundaries — i.e. when Farah's first audio/text-out delta
 *  arrives, signaling the user's turn is over. */
function commitUserPartialIfAny(): void {
  useVoiceStore.setState((s) => {
    const text = s.partial.trim();
    if (!text) return s;
    const userMsg: VoiceMessage = {
      id: genId(),
      role: 'user',
      text,
      source: 'voice',
      createdAt: new Date().toISOString(),
    };
    return { messages: [...s.messages, userMsg], partial: '' };
  });
}

function handleServerFrame(frame: ServerFrame): void {
  switch (frame.type) {
    case 'connected':
      // ready() in connect() already settled — nothing to do here.
      break;

    case 'audio':
      // First audio chunk of Farah's turn → seal off the user partial.
      if (useVoiceStore.getState().state !== 'responding') {
        commitUserPartialIfAny();
      }
      ensurePlayer().enqueue(frame.data);
      useVoiceStore.setState((s) => (s.state === 'idle' ? s : { state: 'responding' }));
      break;

    case 'text-in':
      // Ignore trailing user-STT chunks that arrive after we've already
      // committed the user bubble for this turn (Gemini's STT can lag a
      // little behind its own VAD turn-boundary signal).
      useVoiceStore.setState((s) =>
        s.state === 'responding' ? s : { partial: s.partial + frame.delta },
      );
      break;

    case 'text-out':
      useVoiceStore.setState((s) => {
        if (s.state === 'idle') return s; // session ended; drop late deltas
        const messages = [...s.messages];
        const last = messages[messages.length - 1];
        if (last && last.role === 'farah' && last.id === streamingFarahId) {
          messages[messages.length - 1] = { ...last, text: last.text + frame.delta };
          return { messages, state: 'responding' };
        }
        // First Farah delta of this turn → seal off the user partial
        // outside this updater (we already have it via setState callback).
        const userText = s.partial.trim();
        if (userText) {
          messages.push({
            id: genId(),
            role: 'user',
            text: userText,
            source: 'voice',
            createdAt: new Date().toISOString(),
          });
        }
        const fresh: VoiceMessage = {
          id: genId(),
          role: 'farah',
          text: frame.delta,
          source: 'voice',
          createdAt: new Date().toISOString(),
        };
        streamingFarahId = fresh.id;
        messages.push(fresh);
        return { messages, state: 'responding', partial: '' };
      });
      break;

    case 'turn_complete':
      // Farah finished speaking. If the mic is still open (live voice
      // session), drop back to 'listening'. If text mode, settle to idle.
      useVoiceStore.setState((s) => {
        if (s.state === 'idle') return s;
        return { state: recorder ? 'listening' : 'idle' };
      });
      streamingFarahId = null;
      break;

    case 'interrupted':
      // User started speaking over Farah → drop any queued audio so she
      // goes quiet instantly. The current Farah bubble stays in the
      // transcript as a partial reply (not deleted) — that's a real
      // record of what she'd started to say before being cut off.
      player?.flush();
      streamingFarahId = null;
      useVoiceStore.setState((s) => {
        if (s.state === 'idle') return s;
        return { state: recorder ? 'listening' : 'idle' };
      });
      break;

    case 'error':
      // eslint-disable-next-line no-console
      console.error('[voice] backend error:', frame.message);
      useVoiceStore.setState({ state: 'idle' });
      break;
  }
}

// ─── Public connection actions ───────────────────────────────────────────

/**
 * Try to open the voice WebSocket. Always resolves — check `connection`
 * to know whether to use the real or the mock pipeline.
 */
export function connectVoice(query?: Record<string, string | undefined>): Promise<void> {
  if (socket) return Promise.resolve();
  if (connectInFlight) return connectInFlight;
  connectInFlight = doConnect(query).finally(() => {
    connectInFlight = null;
  });
  return connectInFlight;
}

async function doConnect(query?: Record<string, string | undefined>): Promise<void> {
  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  const url = buildVoiceUrl(apiBase, query);
  if (!url) {
    useVoiceStore.setState({ connection: 'offline' });
    return;
  }
  useVoiceStore.setState({ connection: 'connecting' });
  // Assign the wrapper to module state immediately so subsequent close()
  // calls during a re-mount (StrictMode) actually find a socket to close
  // and so the onClose handler can compare identity before nulling state.
  let createdWs: VoiceSocket | null = null;
  try {
    const ws = createVoiceSocket({
      url,
      connectTimeoutMs: CONNECT_TIMEOUT_MS,
      onFrame: handleServerFrame,
      onClose: () => {
        // Only react if this is still the active socket — older sockets
        // from a discarded mount cycle shouldn't reset store state.
        if (socket && socket !== createdWs) return;
        socket = null;
        tearDownAudio();
        useVoiceStore.setState({ connection: 'offline', state: 'idle' });
      },
    });
    createdWs = ws;
    socket = ws;
    await ws.ready();
    // After awaiting, verify we're still the active socket. If a newer
    // connection took over, abandon this one quietly.
    if (socket === ws) {
      useVoiceStore.setState({ connection: 'connected' });
    } else {
      ws.close();
    }
  } catch {
    if (socket === createdWs) {
      socket = null;
      useVoiceStore.setState({ connection: 'offline' });
    }
  }
}

export function disconnectVoice(): void {
  socket?.close();
  socket = null;
  tearDownAudio();
  useVoiceStore.setState({ connection: 'idle' });
}

// ─── Real-pipeline user actions (screen calls these when connected) ──────
//
// Continuous mode: realStartLive opens the mic once and keeps it open. PCM
// chunks stream out continuously; Gemini Live's VAD handles turn-taking
// server-side. The user explicitly ends the session via realEndLive (which
// closes both the mic and any in-flight Farah playback).

export async function realStartLive(): Promise<void> {
  if (!socket) throw new Error('voice: not connected');
  // Idempotent — if recorder already exists, the call is a no-op.
  if (recorder) return;
  useVoiceStore.setState({ state: 'listening', partial: '' });
  recorder = createAudioRecorder({
    onChunk: (b64) => socket?.send({ type: 'audio', data: b64 }),
    onError: (err) => {
      // eslint-disable-next-line no-console
      console.error('[voice] recorder error', err);
      recorder = null;
      useVoiceStore.setState({ state: 'idle' });
    },
  });
  try {
    await recorder.start();
  } catch {
    recorder = null;
    useVoiceStore.setState({ state: 'idle' });
  }
}

export function realEndLive(): void {
  recorder?.stop();
  recorder = null;
  player?.flush();
  streamingFarahId = null;
  useVoiceStore.setState({ state: 'idle', partial: '' });
}

/** Current mic RMS, 0..1. Returns 0 when the mic isn't open. The visualizer
 *  polls this on requestAnimationFrame to drive bar heights in real time. */
export function getCurrentMicLevel(): number {
  return recorder?.getLevel() ?? 0;
}

export function realSendText(text: string): void {
  if (!socket) throw new Error('voice: not connected');
  useVoiceStore.getState().commitUserMessage(text, 'text');
  // Don't transition to a transient 'processing' — the response stream
  // will flip us into 'responding' on the first delta. Until then we
  // stay in our current state (likely 'idle' since text mode doesn't
  // require the mic to be open).
  socket.send({ type: 'text', text });
}
