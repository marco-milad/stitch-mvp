import { useUser } from '@clerk/clerk-react';
import { Keyboard, Mic as MicIcon, X } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { AudioVisualizer } from '@/components/voice/AudioVisualizer';
import { MessageBubble } from '@/components/voice/MessageBubble';
import { MicButton } from '@/components/voice/MicButton';
import { SuggestionChips } from '@/components/voice/SuggestionChips';
import { TextInputBar } from '@/components/voice/TextInputBar';
import { SCRIPTED_UTTERANCE_KEYS } from '@/lib/mock/voicePrompts';
import type { SuggestionChip } from '@/lib/schemas/voice';
import { useCurrentProperty } from '@/stores/propertyStore';
import {
  connectVoice,
  realEndLive,
  realSendText,
  realStartLive,
  resolveReplyKey,
  useVoiceStore,
} from '@/stores/voiceStore';

const MOCK_PROCESS_DELAY_MS = 700;
const POST_REPLY_NAV_MS = 400;
const PARTIAL_WORD_MS = 220;

export function Voice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const property = useCurrentProperty();
  const firstName = user?.firstName ?? 'Sara';

  const state = useVoiceStore((s) => s.state);
  const mode = useVoiceStore((s) => s.mode);
  const connection = useVoiceStore((s) => s.connection);
  const messages = useVoiceStore((s) => s.messages);
  const partial = useVoiceStore((s) => s.partial);
  const utteranceIndex = useVoiceStore((s) => s.utteranceIndex);
  const setState = useVoiceStore((s) => s.setState);
  const setMode = useVoiceStore((s) => s.setMode);
  const setPartial = useVoiceStore((s) => s.setPartial);
  const advanceUtteranceIndex = useVoiceStore((s) => s.advanceUtteranceIndex);
  const commitUserMessage = useVoiceStore((s) => s.commitUserMessage);
  const appendFarahReply = useVoiceStore((s) => s.appendFarahReply);
  const clearConversation = useVoiceStore((s) => s.clearConversation);

  const isLive = connection === 'connected';

  // Refs for mock-mode timers + post-reply navigation (works for both modes).
  const partialTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<SuggestionChip['action'] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const clearAllTimers = useCallback(() => {
    if (partialTimerRef.current) clearInterval(partialTimerRef.current);
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    partialTimerRef.current = null;
    replyTimerRef.current = null;
    navTimerRef.current = null;
  }, []);

  // Mount: greet + try WS. Unmount: clean up everything.
  useEffect(() => {
    if (messages.length === 0) {
      appendFarahReply(t('voice.greeting', { name: firstName }));
    }
    void connectVoice({
      context: 'general',
      user_name: firstName,
      property_id: property?.id,
      unit_name: property?.unitName,
    });
    return () => {
      clearAllTimers();
      // Intentionally NOT calling disconnectVoice() — React 18 StrictMode
      // in dev fires the cleanup → remount cycle synchronously, which
      // would tear down a half-established WS handshake. Keeping the
      // socket module-level + alive across remounts lets the second
      // mount reuse it via connectVoice's idempotency check. The WS
      // naturally dies on tab close; an explicit "End session" button or
      // router-level cleanup can call disconnectVoice() if needed later.
      clearConversation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on any conversation change.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, partial, state]);

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navigate]);

  // Post-reply navigation — fires when state settles to 'idle' after a chip
  // with a `navigate` action. Works uniformly for both pipelines: mock
  // typewriter sets state→idle on completion; real pipeline gets there on
  // turn_complete.
  useEffect(() => {
    if (state !== 'idle' || !pendingActionRef.current) return;
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action?.type === 'navigate') {
      navTimerRef.current = setTimeout(() => navigate(action.path), POST_REPLY_NAV_MS);
    }
  }, [state, navigate]);

  // ─── Mock-pipeline helpers ──────────────────────────────────────────────

  const mockSendUserMessage = useCallback(
    (text: string, source: 'voice' | 'text' | 'chip', scriptedReplyKey?: string) => {
      commitUserMessage(text, source);
      setState('processing');
      replyTimerRef.current = setTimeout(() => {
        const replyKey = scriptedReplyKey ?? resolveReplyKey(text);
        appendFarahReply(t(replyKey));
        setState('responding');
      }, MOCK_PROCESS_DELAY_MS);
    },
    [appendFarahReply, commitUserMessage, setState, t],
  );

  const mockStartListening = useCallback(() => {
    setState('listening');
    setPartial('');
    const utteranceKey = SCRIPTED_UTTERANCE_KEYS[utteranceIndex % SCRIPTED_UTTERANCE_KEYS.length]!;
    const utterance = t(utteranceKey);
    advanceUtteranceIndex();
    const words = utterance.split(' ');
    let i = 0;
    partialTimerRef.current = setInterval(() => {
      i += 1;
      setPartial(words.slice(0, i).join(' '));
      if (i >= words.length && partialTimerRef.current) {
        clearInterval(partialTimerRef.current);
        partialTimerRef.current = null;
      }
    }, PARTIAL_WORD_MS);
  }, [advanceUtteranceIndex, setPartial, setState, t, utteranceIndex]);

  const mockStopListening = useCallback(() => {
    if (partialTimerRef.current) {
      clearInterval(partialTimerRef.current);
      partialTimerRef.current = null;
    }
    const text = partial.trim();
    if (!text) {
      setState('idle');
      return;
    }
    mockSendUserMessage(text, 'voice');
  }, [mockSendUserMessage, partial, setState]);

  // ─── Branched action handlers ───────────────────────────────────────────

  const onMicToggle = useCallback(async () => {
    if (isLive) {
      if (state === 'idle') {
        try {
          await realStartLive();
        } catch {
          // Permission denied / audio failed — silently bail; the recorder
          // already reset state to idle.
        }
      } else {
        // Any non-idle state (listening or responding) → end the live
        // session: close mic, flush any in-flight Farah audio, idle.
        realEndLive();
      }
      return;
    }
    // Offline mock pipeline keeps the old walkie-talkie behavior.
    if (state === 'idle') mockStartListening();
    else if (state === 'listening') mockStopListening();
  }, [isLive, state, mockStartListening, mockStopListening]);

  const onChipPick = useCallback(
    (chip: SuggestionChip) => {
      pendingActionRef.current = chip.action ?? null;
      const utterance = t(chip.utteranceKey);
      if (isLive) {
        realSendText(utterance);
      } else {
        mockSendUserMessage(utterance, 'chip', chip.responseKey);
      }
    },
    [isLive, mockSendUserMessage, t],
  );

  const onTextSubmit = useCallback(
    (text: string) => {
      if (isLive) realSendText(text);
      else mockSendUserMessage(text, 'text');
    },
    [isLive, mockSendUserMessage],
  );

  const onTypingComplete = useCallback(() => {
    setState('idle');
  }, [setState]);

  const toggleMode = useCallback(() => {
    setMode(mode === 'voice' ? 'text' : 'voice');
  }, [mode, setMode]);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-ink-50 dark:bg-ink-900">
      {/* Header */}
      <div className="flex flex-row items-center gap-3 px-4 py-3 border-b border-ink-100 dark:border-ink-700 bg-white dark:bg-ink-900">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label={t('voice.close')}
          className="p-2 -ms-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-700"
        >
          <X size={22} className="text-ink-700 dark:text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink-900 dark:text-white leading-tight">
            {t('voice.title')}
          </h1>
          <ConnectionPill connection={connection} />
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => {
          const isLast = i === messages.length - 1;
          const isFarahLatest = isLast && msg.role === 'farah';
          // Typewriter only for mock-pipeline replies — real Gemini text
          // streams in naturally via text-out frames, no typewriter needed.
          const shouldTypewrite = !isLive && isFarahLatest && state === 'responding';
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              typewriter={shouldTypewrite}
              onTypingComplete={shouldTypewrite ? onTypingComplete : undefined}
            />
          );
        })}
        {state === 'listening' && partial && (
          <MessageBubble
            message={{
              id: 'partial',
              role: 'user',
              text: partial,
              source: 'voice',
              createdAt: '',
            }}
          />
        )}
      </div>

      {/* Visualizer / processing dots */}
      <div className="px-4 py-1">
        <AudioVisualizer state={state} />
      </div>

      {state === 'idle' && mode === 'voice' && (
        <div className="px-4 pb-2">
          <SuggestionChips onPick={onChipPick} />
        </div>
      )}

      <div className="px-4 pt-3 pb-5 bg-white dark:bg-ink-900 border-t border-ink-100 dark:border-ink-700">
        {mode === 'voice' ? (
          <div className="flex flex-col items-center gap-2">
            <MicButton state={state} onToggle={onMicToggle} />
          </div>
        ) : (
          <TextInputBar onSubmit={onTextSubmit} disabled={state !== 'idle'} />
        )}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={toggleMode}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-500 dark:text-ink-100 hover:text-brand-600 dark:hover:text-brand-400"
          >
            {mode === 'voice' ? <Keyboard size={12} /> : <MicIcon size={12} />}
            {mode === 'voice' ? t('voice.mode.switchToText') : t('voice.mode.switchToVoice')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connection pill ─────────────────────────────────────────────────────

function ConnectionPill({
  connection,
}: {
  connection: 'idle' | 'connecting' | 'connected' | 'offline';
}) {
  const { t } = useTranslation();
  if (connection === 'connecting') {
    return (
      <p className="text-[11px] inline-flex items-center gap-1 text-amber-600 dark:text-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Connecting…
      </p>
    );
  }
  if (connection === 'connected') {
    return (
      <p className="text-[11px] inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <span className="relative inline-flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-500" />
        </span>
        {t('voice.status.online')}
      </p>
    );
  }
  if (connection === 'offline') {
    return (
      <p className="text-[11px] inline-flex items-center gap-1 text-ink-500 dark:text-ink-100">
        <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />
        {t('voice.status.offline')}
      </p>
    );
  }
  return null;
}
