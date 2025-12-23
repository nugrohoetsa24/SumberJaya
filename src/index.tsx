import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import * as XLSX from 'xlsx';

// Make XLSX available globally or ensure it's loaded if not using bundler
// In a real CRA/Vite app, npm install xlsx handles this.
// For this standalone output, we assume imports work or we'd add script tag logic.
// However, since we used import * as XLSX, we rely on the environment having it.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
