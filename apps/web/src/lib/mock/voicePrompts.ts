// 8 conversational shortcuts surfaced as chips on the idle voice screen.
// Each chip carries the user's utterance + Farah's scripted reply as i18n
// keys, and an optional deep-link that fires after the reply finishes.

import type { SuggestionChip } from '@/lib/schemas/voice';

export const SUGGESTION_CHIPS: ReadonlyArray<SuggestionChip> = [
  {
    id: 'cleaning',
    emoji: '🧹',
    labelKey: 'voice.chips.cleaning.label',
    utteranceKey: 'voice.chips.cleaning.utterance',
    responseKey: 'voice.chips.cleaning.response',
    action: { type: 'navigate', path: '/services/daily-cleaning' },
  },
  {
    id: 'weekend',
    emoji: '🎬',
    labelKey: 'voice.chips.weekend.label',
    utteranceKey: 'voice.chips.weekend.utterance',
    responseKey: 'voice.chips.weekend.response',
  },
  {
    id: 'gate',
    emoji: '🔑',
    labelKey: 'voice.chips.gate.label',
    utteranceKey: 'voice.chips.gate.utterance',
    responseKey: 'voice.chips.gate.response',
    action: { type: 'navigate', path: '/qr' },
  },
  {
    id: 'fee',
    emoji: '💳',
    labelKey: 'voice.chips.fee.label',
    utteranceKey: 'voice.chips.fee.utterance',
    responseKey: 'voice.chips.fee.response',
  },
  {
    id: 'lights',
    emoji: '💡',
    labelKey: 'voice.chips.lights.label',
    utteranceKey: 'voice.chips.lights.utterance',
    responseKey: 'voice.chips.lights.response',
    action: { type: 'navigate', path: '/services/smart-home' },
  },
  {
    id: 'spa',
    emoji: '🧘',
    labelKey: 'voice.chips.spa.label',
    utteranceKey: 'voice.chips.spa.utterance',
    responseKey: 'voice.chips.spa.response',
    action: { type: 'navigate', path: '/services/wellness/spa' },
  },
  {
    id: 'pass',
    emoji: '🅿️',
    labelKey: 'voice.chips.pass.label',
    utteranceKey: 'voice.chips.pass.utterance',
    responseKey: 'voice.chips.pass.response',
    action: { type: 'navigate', path: '/services/parking/new-pass' },
  },
  {
    id: 'pool',
    emoji: '🏊',
    labelKey: 'voice.chips.pool.label',
    utteranceKey: 'voice.chips.pool.utterance',
    responseKey: 'voice.chips.pool.response',
  },
];

/** Canned utterances cycled through when the user holds the mic — gives
 *  the live-transcript a sense of being real without wiring up speech-to-text. */
export const SCRIPTED_UTTERANCE_KEYS: ReadonlyArray<string> = [
  'voice.utterances.first',
  'voice.utterances.second',
  'voice.utterances.third',
];

/** Keyword-driven fallback replies — covers free-form voice + text input.
 *  First keyword match wins; falls back to a generic reply. */
export const KEYWORD_REPLIES: ReadonlyArray<{ keywords: string[]; replyKey: string }> = [
  { keywords: ['pool', 'حمام', 'سباحة'], replyKey: 'voice.chips.pool.response' },
  { keywords: ['clean', 'تنظيف', 'نظافة'], replyKey: 'voice.chips.cleaning.response' },
  { keywords: ['gate', 'بوابة', 'أمن'], replyKey: 'voice.chips.gate.response' },
  { keywords: ['fee', 'maintenance', 'مصاريف', 'صيانة'], replyKey: 'voice.chips.fee.response' },
  { keywords: ['light', 'إضاءة', 'نور'], replyKey: 'voice.chips.lights.response' },
  { keywords: ['spa', 'massage', 'سبا', 'مساج'], replyKey: 'voice.chips.spa.response' },
  {
    keywords: ['parking', 'visitor', 'pass', 'موقف', 'تصريح'],
    replyKey: 'voice.chips.pass.response',
  },
  {
    keywords: ['weekend', 'event', 'tonight', 'حفلة', 'أسبوع', 'بازار'],
    replyKey: 'voice.chips.weekend.response',
  },
];

export const FALLBACK_REPLY_KEY = 'voice.fallbacks.generic';
