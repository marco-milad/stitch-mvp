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
  iconBg = '#F1F5F9',
  iconFg = '#475569',
  label,
  trailing,
  destructive,
  onClick,
  ariaLabel,
}: Props) {
  const labelStyle = destructive ? { color: '#DC2626' } : undefined;

  // If there's a trailing control (e.g. a Switch), don't make the whole row a button
  // — that would steal clicks from the inner control.
  const Wrapper: 'button' | 'div' = trailing ? 'div' : 'button';

  return (
    <Wrapper
      type={Wrapper === 'button' ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className="w-full flex flex-row items-center px-4 py-3 bg-white dark:bg-ink-700 active:scale-[0.98] transition-transform text-left"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 flex-shrink-0"
        style={{ backgroundColor: destructive ? '#FEE2E2' : iconBg }}
      >
        <Icon color={destructive ? '#DC2626' : iconFg} size={16} />
      </div>
      <span className="flex-1 text-sm text-ink-900 dark:text-white truncate" style={labelStyle}>
        {label}
      </span>
      {trailing ?? <ChevronRight color={colors.ink[400]} size={18} />}
    </Wrapper>
  );
}
