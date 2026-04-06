import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { installMockApiIfMissing } from './api-mock';
import './styles/globals.css';
import './styles/fonts.css';

// If we're running in a plain browser (not Electron), install a mock window.api
// so the UI renders with sample data. In Electron, preload already set window.api.
installMockApiIfMissing();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
