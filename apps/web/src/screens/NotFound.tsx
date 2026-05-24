import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-screen">
      <span className="text-6xl mb-3">🤔</span>
      <h1 className="text-2xl font-bold text-ink-900 dark:text-white mb-2">Page not found</h1>
      <p className="text-ink-500 mb-6 text-center">That route doesn't exist on Stitch.</p>
      <Link to="/" className="bg-brand-500 rounded-xl px-6 py-3 text-white font-semibold">
        Go home
      </Link>
    </div>
  );
}
