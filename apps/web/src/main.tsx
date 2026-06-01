import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import '@/lib/i18n';
import { App } from './App';

// Pre-mount dark-mode bootstrap — read the persisted choice off
// localStorage and apply the `dark` class to <html> BEFORE React
// hydrates. Without this you get a brief flash of the light theme
// while Zustand's persist middleware rehydrates after mount.
try {
  const raw = localStorage.getItem('stitch.theme');
  if (raw) {
    const parsed = JSON.parse(raw) as { state?: { isDark?: boolean } };
    if (parsed.state?.isDark) {
      document.documentElement.classList.add('dark');
    }
  }
} catch {
  // localStorage unavailable / JSON malformed — ignore and let the
  // store default to light.
}

const root = document.getElementById('root');
if (!root) throw new Error('Root container #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
