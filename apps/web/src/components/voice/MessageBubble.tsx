import { useEffect, useState } from 'react';

import type { VoiceMessage } from '@/lib/schemas/voice';

interface Props {
  message: VoiceMessage;
  /** When true and the message is from Farah, reveal text char-by-char. */
  typewriter?: boolean;
  onTypingComplete?: () => void;
}

const CHAR_INTERVAL_MS = 22;

/**
 * One chat bubble. Farah's bubbles can opt into a typewriter reveal —
 * used for the latest reply only. User bubbles render instantly.
 */
export function MessageBubble({ message, typewriter, onTypingComplete }: Props) {
  const isUser = message.role === 'user';
  const [revealed, setRevealed] = useState(typewriter ? '' : message.text);

  useEffect(() => {
    if (!typewriter || isUser) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setRevealed(message.text.slice(0, i));
      if (i >= message.text.length) {
        clearInterval(id);
        onTypingComplete?.();
      }
    }, CHAR_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typewriter, message.id]);

  const stillTyping = typewriter && !isUser && revealed.length < message.text.length;

  return (
    <div
      className={['flex flex-row animate-rise-in', isUser ? 'justify-end' : 'justify-start'].join(
        ' ',
      )}
    >
      <div
        className={[
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-snug backdrop-blur-md',
          isUser
            ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-br-sm rtl:rounded-br-2xl rtl:rounded-bl-sm shadow-md shadow-brand-500/30 ring-1 ring-white/30'
            : 'bg-white/70 dark:bg-ink-700/70 text-ink-900 dark:text-white border border-white/40 dark:border-white/10 shadow-md shadow-ink-900/5 rounded-bl-sm rtl:rounded-bl-2xl rtl:rounded-br-sm',
        ].join(' ')}
      >
        <span>{revealed}</span>
        {stillTyping && (
          <span className="ms-0.5 inline-block w-[2px] h-3.5 bg-current align-middle motion-safe:animate-caret-blink" />
        )}
      </div>
    </div>
  );
}
