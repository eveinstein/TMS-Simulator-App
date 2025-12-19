/**
 * SceneErrorBoundary.jsx
 * ======================
 * Error boundary for catching rendering errors in the 3D scene.
 * Displays a helpful message instead of a blank screen.
 */

import React from 'react';

export class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('[SceneErrorBoundary] Caught error:', error);
    console.error('[SceneErrorBoundary] Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '40px',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)',
          color: '#ffffff',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              margin: '0 0 12px 0',
              color: '#ef4444',
            }}>
              3D Scene Error
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: '0 0 20px 0',
              lineHeight: '1.5',
            }}>
              The 3D scene encountered an error during rendering. This may be due to missing model files or a WebGL issue.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{
                textAlign: 'left',
                fontSize: '11px',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '6px',
                overflow: 'auto',
                maxHeight: '150px',
                color: 'rgba(255, 255, 255, 0.6)',
                margin: '0 0 16px 0',
              }}>
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 20px rgba(239, 68, 68, 0.4)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SceneErrorBoundary;
