import { VISUAL_PALETTE, type StoryVisual } from '@/lib/mock/feedStories';

/**
 * Animated background per reel visual. Each variant runs a single CSS keyframe
 * (defined in tailwind.config.js) over a gradient — keeps animation work off
 * the JS thread so scroll stays smooth.
 */
export function ReelCanvasBg({ visual, height }: { visual: StoryVisual; height: number }) {
  const palette = VISUAL_PALETTE[visual];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`, height }}
    >
      {visual === 'water' && <WaterFlow />}
      {visual === 'zen' && <ZenPulse />}
      {visual === 'fire' && <FireFlicker />}
      {visual === 'leaves' && <LeavesDrift />}
      {visual === 'sparkle' && <SparkleParticles />}
    </div>
  );
}

function WaterFlow() {
  return (
    <div
      className="absolute left-0 right-0 rounded-full bg-white opacity-35 animate-water-flow"
      style={{ top: '40%', height: 80 }}
    />
  );
}

function ZenPulse() {
  return (
    <div
      className="absolute rounded-full bg-white opacity-30 animate-zen-pulse"
      style={{ top: '20%', left: '25%', width: '50%', aspectRatio: '1' }}
    />
  );
}

function FireFlicker() {
  return (
    <div
      className="absolute rounded-full animate-fire-flicker"
      style={{ bottom: 0, left: '30%', width: '40%', height: 80, backgroundColor: '#FED7AA' }}
    />
  );
}

function LeavesDrift() {
  return (
    <div
      className="absolute rounded-full border-8 border-dashed border-white opacity-40 animate-leaves-drift"
      style={{ top: '15%', right: '10%', width: 90, height: 90 }}
    />
  );
}

function SparkleParticles() {
  return (
    <>
      <div
        className="absolute rounded-full bg-white animate-sparkle-a"
        style={{ top: '20%', left: '20%', width: 14, height: 14 }}
      />
      <div
        className="absolute rounded-full bg-white animate-sparkle-b"
        style={{ top: '55%', left: '60%', width: 10, height: 10 }}
      />
      <div
        className="absolute rounded-full bg-white animate-sparkle-a"
        style={{ top: '35%', right: '15%', width: 8, height: 8 }}
      />
      <div
        className="absolute rounded-full bg-white animate-sparkle-b"
        style={{ bottom: '20%', left: '40%', width: 12, height: 12 }}
      />
    </>
  );
}
