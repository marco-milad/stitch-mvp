import { Play } from 'lucide-react';
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';

import type { FeedReel } from '@/lib/mock/feedReels';

import { ReelCanvasBg } from './ReelCanvasBg';

const REEL_H = 280;

function ReelCardImpl({ reel }: { reel: FeedReel }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(`/community/posts/${reel.id}`)}
      aria-label={`Play reel: ${reel.title}`}
      className="relative mx-4 mb-4 rounded-2xl overflow-hidden block w-auto"
      style={{ height: REEL_H }}
    >
      <ReelCanvasBg visual={reel.visual} height={REEL_H} />

      {/* Top-right REEL chip */}
      <div className="absolute top-3 right-3 bg-black/30 px-2 py-1 rounded-md">
        <span className="text-white text-[10px] font-bold tracking-wider">REEL</span>
      </div>

      {/* Centered play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(255,255,255,0.25)',
            border: '1.5px solid rgba(255,255,255,0.6)',
          }}
        >
          <Play color="#fff" size={26} fill="#fff" />
        </div>
      </div>

      {/* Bottom gradient overlay for legibility */}
      <div
        className="absolute bottom-0 left-0 right-0 flex flex-col justify-end p-3.5 text-left"
        style={{ height: 110, backgroundColor: 'rgba(0,0,0,0.35)' }}
      >
        <span className="text-white text-base font-bold mb-1 truncate">{reel.title}</span>
        <span className="text-white/80 text-xs leading-4 line-clamp-2">{reel.desc}</span>
        <span className="text-white/60 text-[10px] mt-1">{reel.when}</span>
      </div>
    </button>
  );
}

export const ReelCard = memo(ReelCardImpl);
