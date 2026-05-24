import { useNavigate } from 'react-router-dom';

export function Onboarding() {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-ink-900 min-h-screen px-6 items-center justify-center">
      <h1 className="text-3xl font-bold mb-2 text-ink-900 dark:text-white">Welcome</h1>
      <p className="text-base text-ink-500 mb-8 text-center">
        Onboarding flow lands in Week 2 — language pick, role confirmation, unit linking.
      </p>
      <button
        type="button"
        onClick={() => navigate('/', { replace: true })}
        className="bg-brand-500 rounded-xl px-6 py-3 text-white font-semibold"
      >
        Continue
      </button>
    </div>
  );
}
