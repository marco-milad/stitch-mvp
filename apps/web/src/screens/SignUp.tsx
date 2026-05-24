import { useSignUp } from '@clerk/clerk-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

export function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pendingCode, setPendingCode] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingCode(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-up failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigate('/', { replace: true });
      } else {
        setError('Verification incomplete — try again');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-ink-900 min-h-screen">
      <form
        onSubmit={pendingCode ? onVerify : onSubmit}
        className="flex-1 flex flex-col px-6 justify-center"
      >
        <h1 className="text-3xl font-bold text-ink-900 dark:text-white mb-6">
          {t('auth.signUpTitle')}
        </h1>

        {!pendingCode ? (
          <>
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
              autoComplete="new-password"
              className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white bg-transparent outline-none focus:border-brand-500"
            />
          </>
        ) : (
          <>
            <p className="text-ink-500 mb-3">Enter the 6-digit code we emailed you.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border border-ink-100 dark:border-ink-700 rounded-xl px-4 py-3 mb-3 text-ink-900 dark:text-white bg-transparent outline-none text-center text-2xl tracking-widest focus:border-brand-500"
            />
          </>
        )}

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-500 disabled:bg-ink-400 rounded-xl py-3.5 text-white font-semibold"
        >
          {submitting ? '…' : t('auth.submit')}
        </button>

        <Link to="/sign-in" className="mt-4 text-center text-brand-500">
          {t('auth.switchToSignIn')}
        </Link>
      </form>
    </div>
  );
}
