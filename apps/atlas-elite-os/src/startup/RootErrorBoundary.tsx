import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ATLAS_BUILD } from '../buildInfo';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  correlationId: string;
}

/**
 * Top-level React error boundary — never leave #root blank after a render crash.
 */
export class RootErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    correlationId:
      (typeof window !== 'undefined' && window.__ATLAS_BOOT__?.correlationId) ||
      `atlas-${Date.now().toString(36)}`,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.__ATLAS_BOOT__?.hide();
    console.error('[Atlas] RootErrorBoundary', {
      category: 'react_render',
      message: error.message,
      correlationId: this.state.correlationId,
      componentStack: info.componentStack?.slice(0, 500),
    });
  }

  private retry = () => {
    this.setState({ error: null });
    window.location.assign(window.location.pathname + window.location.search);
  };

  render() {
    if (!this.state.error) return this.props.children;

    const category = 'react_render_error';
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          margin: 0,
          padding: 32,
          fontFamily: 'Segoe UI, system-ui, sans-serif',
          background: '#0B1F33',
          color: '#F8FAFC',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Atlas hit a recoverable error</h1>
        <p>The application shell crashed during render. Your Microsoft session was not cleared.</p>
        <p style={{ opacity: 0.85 }}>
          Stage: failed · Category: {category}
          <br />
          Correlation: {this.state.correlationId}
          <br />
          Build SHA: {ATLAS_BUILD.sha}
          <br />
          Detail: {this.state.error.message.slice(0, 240)}
        </p>
        <p style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={this.retry}>
            Retry
          </button>
          <a href="/" style={{ color: '#FBBF24' }}>
            Command Center
          </a>
        </p>
      </div>
    );
  }
}

declare global {
  interface Window {
    __ATLAS_BOOT__?: {
      correlationId: string;
      setStage: (stage: string, detail?: string) => void;
      hide: () => void;
      fail: (category: string, message: string) => void;
    };
    __ATLAS_REACT_MOUNTED__?: boolean;
  }
}
