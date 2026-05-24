import { useSignIn } from '@clerk/clerk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

export function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/', { replace: true });
      } else {
        setError('Additional steps required — finish the flow from a full client.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-ink-900 min-h-screen">
      <form onSubmit={onSubmit} className="flex-1 flex flex-col px-6 justify-center">
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white mb-1">
          {t('auth.signInTitle')}
        </h1>
        <p className="text-base text-ink-500 mb-8">{t('auth.signInSubtitle')}</p>

        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white bg-transparent outline-none focus:border-brand-500"
        />
        <input
          type="password"
          placeholder={t('auth.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white bg-transparent outline-none focus:border-brand-500"
        />

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !email || !password}
          className="bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 text-white font-semibold"
        >
          {submitting ? '…' : t('auth.submit')}
        </button>

        <Link to="/sign-up" className="mt-4 text-center text-brand-500">
          {t('auth.switchToSignUp')}
        </Link>

        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="mt-6 text-ink-500"
        >
          {t('auth.skipForNow')}
        </button>
      </form>
    </div>
  );
}
