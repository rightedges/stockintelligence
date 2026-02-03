import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global Diagnostic Script - Catches crashes before React starts
window.onerror = function (message, source, lineno, colno, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:#7f1d1d; color:white; padding:40px; z-index:999999; font-family:monospace; overflow:auto;";
  errorDiv.innerHTML = `
        <h1 style="font-size:24px; color:#f87171; border-bottom:2px solid #ef4444; padding-bottom:10px; margin-bottom:20px;">
            ⚠️ FATAL CORE CRASH: APP FAILED TO BOOT
        </h1>
        <div style="background:#450a0a; padding:20px; border-radius:8px; margin-bottom:20px;">
            <p><strong>Error Message:</strong> ${message}</p>
            <p><strong>Location:</strong> ${source}:${lineno}:${colno}</p>
        </div>
        <div style="margin-top:20px; color:#fecaca; font-size:12px;">
            Please report this exact message for remote troubleshooting.
        </div>
        <button onclick="window.location.reload()" style="margin-top:20px; background:#ef4444; color:white; border:none; padding:10px 20px; border-radius:4px; cursor:pointer; font-weight:bold;">
            Retry Connection
        </button>
    `;
  document.body.appendChild(errorDiv);
};

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (e) {
  console.error("Mount Failure", e);
  const mountDiv = document.createElement('div');
  mountDiv.style = "position:fixed; top:0; left:0; z-index:999999; background:red; color:white; padding:20px;";
  mountDiv.innerHTML = `Mount Failure: ${e.message}`;
  document.body.appendChild(mountDiv);
}
