// PCM conversion helpers. Gemini Live wants Int16 PCM at 16 kHz in /
// 24 kHz out; the browser's AudioContext gives us Float32 at whatever
// the device's native rate is (usually 44.1 / 48 kHz), so we downsample
// + requantize for the upstream direction, and dequantize for playback.

/** Float32 (-1.0..1.0) → Int16 (-32768..32767). */
export function floatToInt16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const s = Math.max(-1, Math.min(1, input[i] ?? 0));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

/** Int16 → Float32 (-1.0..1.0). */
export function int16ToFloat(input: Int16Array): Float32Array {
  const out = new Float32Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const v = input[i] ?? 0;
    out[i] = v < 0 ? v / 0x8000 : v / 0x7fff;
  }
  return out;
}

/**
 * Cheap nearest-neighbor downsampler. Voice quality is fine — perceptual
 * artifacts from aliasing are inaudible for speech. Replace with a proper
 * sinc/cubic resampler if music or wide-band audio becomes a requirement.
 */
export function downsample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    out[i] = input[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

/** Int16Array → base64 string (transport-friendly for WebSocket text frames). */
export function int16ToBase64(input: Int16Array): string {
  const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  let binary = '';
  // Walk in chunks to avoid blowing the call-stack on String.fromCharCode(...spread).
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Base64 → Int16Array — the inverse of int16ToBase64. */
export function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  // Buffer is byte-aligned but Int16 needs 2-byte alignment — if the input
  // length is odd we drop the trailing byte (shouldn't happen in practice).
  const aligned = bytes.byteLength % 2 === 0 ? bytes : bytes.subarray(0, bytes.byteLength - 1);
  return new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
}
