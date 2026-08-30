import React from 'react';

/**
 * Catches any crash in a child screen so the WHOLE app never goes black.
 * Shows a friendly message + a button to go back, instead of a blank screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log so it shows in console (Ctrl+Shift+I) for debugging
    console.error('App crash caught by ErrorBoundary:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16,
          padding: 40, textAlign: 'center', fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h2 style={{ color: '#b91c1c', fontWeight: 900, margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#64748b', maxWidth: 420, fontWeight: 600 }}>
            An unexpected error occurred on this screen. The application is still running. You can click the button below to retry or navigate to another screen.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button onClick={this.handleReset} style={{
              padding: '12px 22px', background: '#0f172a', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer',
            }}>Try Again</button>
            <button onClick={() => window.location.reload()} style={{
              padding: '12px 22px', background: '#166534', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 800, cursor: 'pointer',
            }}>Refresh Page</button>
          </div>
          {this.state.error && (
            <pre style={{
              marginTop: 14, maxWidth: 520, overflow: 'auto', fontSize: 11,
              color: '#94a3b8', background: '#f8fafc', padding: 12, borderRadius: 8,
            }}>{String(this.state.error?.message || this.state.error)}</pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
