import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';
import '@/lib/i18n';
import { App } from './App';

const root = document.getElementById('root');
if (!root) throw new Error('Root container #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
