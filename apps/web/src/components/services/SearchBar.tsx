import { Search, X } from 'lucide-react';

import { colors } from '@/lib/theme';

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search services…' }: Props) {
  return (
    <div className="mx-4 mt-2 mb-3 flex flex-row items-center bg-white dark:bg-ink-700 rounded-2xl px-3 py-2 border border-ink-100 dark:border-ink-700">
      <Search color={colors.ink[400]} size={18} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoCorrect="off"
        autoCapitalize="none"
        className="flex-1 mx-2 text-sm bg-transparent outline-none text-ink-900 dark:text-white placeholder:text-ink-400"
      />
      {value.length > 0 && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <X color={colors.ink[400]} size={16} />
        </button>
      )}
    </div>
  );
}
