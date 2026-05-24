// Gapless PCM playback queue for Farah's responses.
//
// Receives base64-encoded Int16 PCM chunks @24 kHz and schedules them
// back-to-back via AudioBufferSourceNode. The trick is maintaining a
// `nextStartTime` cursor in AudioContext-time so each chunk is appended
// to the playback timeline without overlap or gap, even when chunks
// arrive faster than they play.

import { base64ToInt16, int16ToFloat } from './pcm';

const OUTPUT_RATE = 24_000;

export interface AudioPlayer {
  enqueue: (base64: string) => void;
  /** Stop playback immediately + drop any queued chunks. */
  flush: () => void;
  close: () => void;
}

export function createAudioPlayer(): AudioPlayer {
  let context: AudioContext | null = null;
  let nextStartTime = 0;
  const activeSources = new Set<AudioBufferSourceNode>();

  const ensureContext = (): AudioContext => {
    if (context) return context;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    context = new Ctx();
    nextStartTime = context.currentTime;
    return context;
  };

  const enqueue = (b64: string): void => {
    const ctx = ensureContext();

    // Many browsers suspend AudioContext until a user gesture — make sure
    // it's running before scheduling. Resume is a no-op when already running.
    if (ctx.state === 'suspended') void ctx.resume();

    const int16 = base64ToInt16(b64);
    if (int16.length === 0) return;
    const float = int16ToFloat(int16);

    const buffer = ctx.createBuffer(1, float.length, OUTPUT_RATE);
    // `set` accepts ArrayLike<number> so we sidestep the strict
    // Float32Array<ArrayBuffer> vs ArrayBufferLike mismatch that
    // `copyToChannel` enforces under newer TS lib types.
    buffer.getChannelData(0).set(float);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const startAt = Math.max(ctx.currentTime, nextStartTime);
    source.start(startAt);
    nextStartTime = startAt + buffer.duration;

    activeSources.add(source);
    source.onended = () => {
      activeSources.delete(source);
    };
  };

  const flush = (): void => {
    for (const src of activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // already-stopped sources throw — ignore
      }
    }
    activeSources.clear();
    nextStartTime = context?.currentTime ?? 0;
  };

  const close = (): void => {
    flush();
    void context?.close();
    context = null;
  };

  return { enqueue, flush, close };
}
