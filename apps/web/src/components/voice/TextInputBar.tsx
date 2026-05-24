import { Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function TextInputBar({ onSubmit, disabled }: Props) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const handle = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue('');
  };

  return (
    <form onSubmit={handle} className="flex flex-row items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={disabled}
        placeholder={t('voice.text.placeholder')}
        className="flex-1 rounded-full px-4 py-2.5 text-sm bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700 outline-none focus:border-brand-500 transition-colors disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        aria-label={t('voice.text.send')}
        className="w-10 h-10 rounded-full bg-brand-500 disabled:bg-ink-400 flex items-center justify-center flex-shrink-0"
      >
        <Send size={18} color="#fff" className="rtl:rotate-180" />
      </button>
    </form>
  );
}
