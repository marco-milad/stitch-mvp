import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <span className="text-6xl mb-4">🛣️</span>
      <h1 className="text-xl font-bold text-ink-900 mb-2">404</h1>
      <p className="text-sm text-ink-500 mb-6">Not found.</p>
      <Link
        to="/content"
        className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold"
      >
        {t('nav.content')}
      </Link>
    </div>
  );
}
