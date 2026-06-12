import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { dbService } from './lib/db';

// Seed initial court case records and accounting receipts into local IndexedDB
dbService.seedInitialDemoData()
  .then(() => console.log('[DB] Seeding completed or verified!'))
  .catch(err => console.error('[DB] Seeding error:', err));

// Register Progressive Web App Service Worker for offline-first support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[PWA] Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
