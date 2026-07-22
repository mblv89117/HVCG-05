import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { RootErrorBoundary } from './startup/RootErrorBoundary';
import './app.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  window.__ATLAS_BOOT__?.fail('missing_root', 'Document is missing #root');
  throw new Error('Atlas #root element missing');
}

window.__ATLAS_BOOT__?.setStage('Starting React', 'Mounting Atlas shell…');

createRoot(rootEl).render(
  <StrictMode>
    <RootErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RootErrorBoundary>
  </StrictMode>,
);

// Mark mount attempted; AuthProvider hides boot splash after MSAL ready.
window.__ATLAS_REACT_MOUNTED__ = true;
