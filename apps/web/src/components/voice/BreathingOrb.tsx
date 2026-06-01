// Farah orb — three layered radial gradients (cyan core, violet halo,
// accent outer) breathing on a 4.2s eased loop. State-driven:
//
//   idle        → slow breath, soft cyan/violet glow
//   listening   → faster pulse, hue shifts toward red as the user speaks
//   responding  → cyan saturates, subtle pulse
//   processing  → orb compresses with a tighter spin (handled by sparkle)
//
// Pairs with the existing AudioVisualizer (placed below the orb in
// listening/responding states). On idle the orb is the centrepiece, so
// the bar visualizer hides and the orb does all the heavy lifting.

import type { VoiceState } from '@/lib/schemas/voice';

interface Props {
  state: VoiceState;
  /** Optional size override (px). Default 200. */
  size?: number;
}

export function BreathingOrb({ state, size = 200 }: Props) {
  const isListening = state === 'listening';
  const isResponding = state === 'responding';
  const isProcessing = state === 'processing';

  // Three radial layers — outer halo, mid violet wash, inner cyan core.
  // Layer scales/opacities vary per state so the orb has a distinct
  // visual identity for each mode.
  const outerHue = isListening
    ? 'rgba(248, 113, 113, 0.40)' // red-400
    : isResponding
      ? 'rgba(34, 211, 238, 0.55)' // cyan-400
      : 'rgba(124, 58, 237, 0.35)'; // accent

  const midHue = isListening
    ? 'rgba(244, 114, 182, 0.55)' // pink-400
    : 'rgba(124, 58, 237, 0.55)';

  const coreHue = isResponding
    ? 'rgba(6, 182, 212, 0.95)' // brand-500
    : 'rgba(34, 211, 238, 0.85)';

  return (
    <div
      className="relative motion-safe:animate-orb-breathe"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer halo — large blur, low opacity */}
      <div
        className={`absolute inset-0 rounded-full blur-3xl ${
          isProcessing ? 'motion-safe:animate-pulse' : ''
        }`}
        style={{ backgroundColor: outerHue }}
      />
      {/* Mid violet wash */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          inset: size * 0.1,
          backgroundColor: midHue,
        }}
      />
      {/* Inner cyan core — solid-ish, glass ring around it */}
      <div
        className="absolute rounded-full ring-1 ring-white/40 backdrop-blur-md flex items-center justify-center"
        style={{
          inset: size * 0.2,
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55), ${coreHue} 65%)`,
          boxShadow: `0 0 ${size * 0.25}px ${coreHue}`,
        }}
      >
        {/* Specular highlight — a small white blob in the upper-left */}
        <span
          className="absolute rounded-full bg-white/55 blur-sm"
          style={{
            top: size * 0.18,
            left: size * 0.22,
            width: size * 0.12,
            height: size * 0.07,
          }}
        />
      </div>
    </div>
  );
}
