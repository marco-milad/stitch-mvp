import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { colors } from '@/lib/theme';

interface Props {
  Icon: LucideIcon;
  iconBg?: string;
  iconFg?: string;
  label: string;
  /** Right-aligned content (e.g. a switch). Falls back to a chevron. */
  trailing?: ReactNode;
  destructive?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
}

export function ProfileRow({
  Icon,
  iconBg = '#F4EEE3', // sand-100 — neutral default per Rule 1
  iconFg = '#6B6660', // ink-500
  label,
  trailing,
  destructive,
  onClick,
  ariaLabel,
}: Props) {
  const labelStyle = destructive ? { color: '#B84A2E' } : undefined;

  // If there's a trailing control (e.g. a Switch), don't make the whole row a button
  // — that would steal clicks from the inner control.
  const Wrapper: 'button' | 'div' = trailing ? 'div' : 'button';

  return (
    <Wrapper
      type={Wrapper === 'button' ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="w-full flex flex-row items-center px-4 py-3.5 bg-white dark:bg-ink-700 hover:bg-sand-50 dark:hover:bg-ink-700/80 active:scale-[0.98] transition-all duration-fast ease-smooth text-left"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: destructive ? '#F4DCD2' : iconBg }}
      >
        <Icon color={destructive ? '#B84A2E' : iconFg} size={16} strokeWidth={2} />
      </div>
      <span
        className="flex-1 text-body-md font-bold text-ink-950 dark:text-white truncate"
        style={labelStyle}
      >
        {label}
      </span>
      {trailing ?? <ChevronRight color={colors.ink[300]} size={18} />}
    </Wrapper>
  );
}
