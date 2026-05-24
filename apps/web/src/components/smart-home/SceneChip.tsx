import { useTranslation } from 'react-i18next';

import type { SmartScene } from '@/lib/schemas/smartHome';

interface Props {
  scene: SmartScene;
  onApply: () => void;
}

export function SceneChip({ scene, onApply }: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onApply}
      className="flex-shrink-0 inline-flex items-center gap-1.5 bg-white dark:bg-ink-700 border border-ink-100 dark:border-ink-700 hover:border-brand-400 active:scale-95 transition-all rounded-full px-3 py-1.5 text-xs font-semibold text-ink-900 dark:text-white"
    >
      <span className="text-base leading-none">{scene.emoji}</span>
      <span>{t(scene.nameKey)}</span>
    </button>
  );
}
