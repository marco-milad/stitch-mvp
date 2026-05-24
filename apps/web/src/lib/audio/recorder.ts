// Mic → 16 kHz Int16 PCM chunk pipeline.
//
// Uses ScriptProcessorNode (deprecated but inline + reliable) instead of
// AudioWorklet to avoid a separate worklet processor file in this iteration.
// Real-world voice latency is acceptable; swap to AudioWorklet later for
// improved performance + future-proofing.
//
// Output: ~100 ms chunks (1600 samples @16 kHz = 3200 bytes Int16) emitted
// via the onChunk callback as base64-encoded strings ready to go over WS.

import { downsample, floatToInt16, int16ToBase64 } from './pcm';

const TARGET_RATE = 16_000;
const BUFFER_SIZE = 4096; // power-of-2 samples — ScriptProcessor requirement

export interface AudioRecorderOptions {
  onChunk: (base64: string) => void;
  onError?: (err: Error) => void;
}

export interface AudioRecorder {
  start: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
  /** Current RMS level of the mic input, 0..1. Returns 0 when not running. */
  getLevel: () => number;
}

const ANALYSER_FFT_SIZE = 512;

export function createAudioRecorder(opts: AudioRecorderOptions): AudioRecorder {
  let context: AudioContext | null = null;
  let stream: MediaStream | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let processor: ScriptProcessorNode | null = null;
  let analyser: AnalyserNode | null = null;
  // Narrow to <ArrayBuffer> (not ArrayBufferLike) so
  // analyser.getFloatTimeDomainData accepts it under TS 5.7's strict types.
  let levelBuf: Float32Array<ArrayBuffer> | null = null;
  let running = false;

  const start = async (): Promise<void> => {
    if (running) return;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      context = new Ctx();
      source = context.createMediaStreamSource(stream);
      processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        if (!running) return;
        const float = e.inputBuffer.getChannelData(0);
        const sampleRate = e.inputBuffer.sampleRate;
        const down = downsample(float, sampleRate, TARGET_RATE);
        const int16 = floatToInt16(down);
        opts.onChunk(int16ToBase64(int16));
      };

      // Parallel branch off the mic source for the visualizer's RMS readings.
      // AnalyserNode just taps the signal — it doesn't consume or modify it.
      analyser = context.createAnalyser();
      analyser.fftSize = ANALYSER_FFT_SIZE;
      levelBuf = new Float32Array(analyser.fftSize);
      source.connect(analyser);

      source.connect(processor);
      // ScriptProcessor needs to be connected to a destination to fire its
      // onaudioprocess callback in some browsers. Hook to a muted gain node
      // so we don't actually play the mic back to the user.
      const muted = context.createGain();
      muted.gain.value = 0;
      processor.connect(muted);
      muted.connect(context.destination);

      running = true;
    } catch (err) {
      running = false;
      opts.onError?.(err instanceof Error ? err : new Error(String(err)));
      stop();
      throw err;
    }
  };

  const stop = (): void => {
    running = false;
    try {
      processor?.disconnect();
      analyser?.disconnect();
      source?.disconnect();
      stream?.getTracks().forEach((t) => t.stop());
      void context?.close();
    } catch {
      // best-effort cleanup
    }
    processor = null;
    analyser = null;
    levelBuf = null;
    source = null;
    stream = null;
    context = null;
  };

  const getLevel = (): number => {
    if (!running || !analyser || !levelBuf) return 0;
    analyser.getFloatTimeDomainData(levelBuf);
    let sumSquares = 0;
    for (let i = 0; i < levelBuf.length; i += 1) {
      const v = levelBuf[i] ?? 0;
      sumSquares += v * v;
    }
    const rms = Math.sqrt(sumSquares / levelBuf.length);
    return rms > 1 ? 1 : rms;
  };

  return {
    start,
    stop,
    isRunning: () => running,
    getLevel,
  };
}
