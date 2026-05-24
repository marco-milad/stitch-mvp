import { Loader2, Mic } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { VoiceState } from '@/lib/schemas/voice';

interface Props {
  state: VoiceState;
  onToggle: () => void;
}

/**
 * Tap-to-toggle mic button. The real Gemini bridge can keep the same API
 * (toggle on → start streaming audio; toggle off → close and process).
 * Press-and-hold UX is intentionally not implemented — tap-to-toggle is
 * more accessible and matches modern voice-assistant patterns.
 */
export function MicButton({ state, onToggle }: Props) {
  const { t } = useTranslation();

  // Continuous-conversation model: mic stays open during both 'listening'
  // (waiting on user) and 'responding' (Farah replying, user can barge in).
  // Only 'processing' disables the tap — that's a transient mock state.
  const isLive = state === 'listening' || state === 'responding';
  const disabled = state === 'processing';

  const hintKey =
    state === 'listening'
      ? 'voice.mic.listeningHint'
      : state === 'processing'
        ? 'voice.mic.processingHint'
        : state === 'responding'
          ? 'voice.mic.respondingHint'
          : 'voice.mic.idleHint';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={t(hintKey)}
        aria-pressed={isLive ? 'true' : 'false'}
        className={[
          'relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all',
          isLive
            ? 'bg-red-500 scale-110'
            : disabled
              ? 'bg-ink-400'
              : 'bg-brand-500 hover:bg-brand-600 active:scale-95',
        ].join(' ')}
      >
        {isLive && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
            <span className="absolute inset-[-8px] rounded-full bg-red-500/20 animate-ping [animation-delay:200ms]" />
          </>
        )}
        {state === 'processing' ? (
          <Loader2 size={32} color="#fff" className="animate-spin" />
        ) : (
          <Mic size={32} color="#fff" />
        )}
      </button>
      <p className="text-[11px] text-ink-500 dark:text-ink-100">{t(hintKey)}</p>
    </div>
  );
}
