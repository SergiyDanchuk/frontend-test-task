import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function start() {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  });

  const root = document.getElementById('root');
  if (!root) throw new Error('Root element was not found');

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void start();
