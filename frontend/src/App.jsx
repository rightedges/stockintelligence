import React from 'react';
import Dashboard from './components/Dashboard';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#450a0a', color: 'white', height: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: '#f87171' }}>⚠️ REACT RENDER CRASH</h1>
          <p style={{ background: '#7f1d1d', padding: '20px', borderRadius: '8px' }}>
            {this.state.error && this.state.error.toString()}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', background: '#ef4444', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer' }}
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { Toaster } from 'sonner';

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <Toaster richColors position="top-right" theme="dark" />
        <Dashboard />
      </div>
    </ErrorBoundary>
  );
}

export default App;
