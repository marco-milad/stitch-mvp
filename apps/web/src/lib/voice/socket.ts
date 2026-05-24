// Typed wrapper around the Voice WebSocket. Owns the connection lifecycle
// and exposes a tiny event API for the store to consume.
//
// Frame protocol (matches apps/api/app/api/v1/voice.py):
//   client → server  { type: 'audio' | 'text' | 'end', ... }
//   server → client  { type: 'connected' | 'audio' | 'text-in' | 'text-out' | 'turn_complete' | 'error', ... }

export type ClientFrame =
  | { type: 'audio'; data: string }
  | { type: 'text'; text: string }
  | { type: 'end' };

export type ServerFrame =
  | { type: 'connected'; voice?: string; context?: string; sampleRate?: number }
  | { type: 'audio'; data: string; sampleRate?: number }
  | { type: 'text-in'; delta: string }
  | { type: 'text-out'; delta: string }
  | { type: 'turn_complete' }
  | { type: 'interrupted' } // Gemini signals when user barges in on Farah's audio
  | { type: 'error'; message: string };

export interface VoiceSocketOptions {
  url: string;
  onOpen?: () => void;
  onFrame: (frame: ServerFrame) => void;
  onClose?: (e: CloseEvent) => void;
  onError?: (err: Event) => void;
  /** Milliseconds to wait for the initial 'open' before giving up. */
  connectTimeoutMs?: number;
}

export interface VoiceSocket {
  send: (frame: ClientFrame) => void;
  close: () => void;
  readyState: () => number;
  /** Promise that resolves when the socket opens; rejects on timeout / error. */
  ready: () => Promise<void>;
}

export function createVoiceSocket(opts: VoiceSocketOptions): VoiceSocket {
  const ws = new WebSocket(opts.url);
  let resolveReady: (() => void) | null = null;
  let rejectReady: ((reason: Error) => void) | null = null;
  const readyPromise = new Promise<void>((res, rej) => {
    resolveReady = res;
    rejectReady = rej;
  });

  const timeout = opts.connectTimeoutMs ?? 2000;
  const timeoutId = setTimeout(() => {
    if (ws.readyState !== WebSocket.OPEN) {
      rejectReady?.(new Error('voice-socket: connect timeout'));
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
  }, timeout);

  ws.onopen = () => {
    clearTimeout(timeoutId);
    resolveReady?.();
    opts.onOpen?.();
  };

  ws.onmessage = (e) => {
    try {
      const frame = JSON.parse(e.data) as ServerFrame;
      opts.onFrame(frame);
    } catch {
      // malformed frame — ignore
    }
  };

  ws.onclose = (e) => {
    clearTimeout(timeoutId);
    if (ws.readyState !== WebSocket.OPEN) {
      rejectReady?.(new Error('voice-socket: closed before open'));
    }
    opts.onClose?.(e);
  };

  ws.onerror = (e) => {
    clearTimeout(timeoutId);
    opts.onError?.(e);
    rejectReady?.(new Error('voice-socket: error'));
  };

  return {
    send: (frame) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify(frame));
      } catch {
        // ignore — caller can detect via close handler
      }
    },
    close: () => {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'end' }));
        ws.close();
      } catch {
        // ignore
      }
    },
    readyState: () => ws.readyState,
    ready: () => readyPromise,
  };
}

/** Build the ws:// URL from the configured API base URL. */
export function buildVoiceUrl(
  apiBaseUrl: string | undefined,
  query?: Record<string, string | undefined>,
): string | null {
  if (!apiBaseUrl) return null;
  try {
    const base = new URL(apiBaseUrl);
    base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    base.pathname = `${base.pathname.replace(/\/$/, '')}/api/v1/voice`;
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v) base.searchParams.set(k, v);
      }
    }
    return base.toString();
  } catch {
    return null;
  }
}
