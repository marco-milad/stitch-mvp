// Voice assistant ("Farah") state shapes. All UI is mocked — real
// MediaRecorder / Gemini Live WebSocket integration drops in by
// replacing the store's pressMic / releaseMic / submitText actions.

export type VoiceState = 'idle' | 'listening' | 'processing' | 'responding';
export type VoiceMode = 'voice' | 'text';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'farah';
  text: string;
  /** Source mode — voice tape, typed text, or chip-shortcut. */
  source: 'voice' | 'text' | 'chip';
  createdAt: string;
}

export interface SuggestionChip {
  id: string;
  emoji: string;
  labelKey: string; // short chip label
  utteranceKey: string; // what gets written as the user message
  responseKey: string; // Farah's scripted reply
  /** Optional deep-link to fire ~500 ms after the response finishes typing. */
  action?: { type: 'navigate'; path: string };
}
