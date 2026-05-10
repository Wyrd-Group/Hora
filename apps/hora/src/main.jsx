import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'
import './styles/ritual.css'
import { initNative } from './native'

// Initialize Sentry error tracking (no-ops if DSN not set)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Initialize native platform (Capacitor) — no-ops on web
initNative();

// Patch luma.gl CanvasContext to guard against device.limits being undefined
// during async device initialization (fixes maxTextureDimension2D TypeError)
import { CanvasContext } from '@luma.gl/core';
if (CanvasContext?.prototype) {
  const orig = CanvasContext.prototype.getMaxDrawingBufferSize;
  CanvasContext.prototype.getMaxDrawingBufferSize = function () {
    if (!this.device?.limits?.maxTextureDimension2D) {
      return [2048, 2048]; // safe fallback until device is ready
    }
    return orig.call(this);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
