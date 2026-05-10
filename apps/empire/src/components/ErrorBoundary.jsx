import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[AEGIS] ErrorBoundary caught:', error, info.componentStack);
    // Report to Sentry if initialized
    import('@sentry/react').then(Sentry => {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: info.componentStack } },
      });
    }).catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-full min-h-[120px] p-6">
          <div className="bg-[rgba(24,22,18,0.85)] border border-[rgba(232,224,208,0.10)] backdrop-blur-[14px] rounded-lg p-6 max-w-sm text-center">
            <div className="text-rose-400 text-lg mb-2">Something went wrong</div>
            <p className="text-[#9C8E7E] text-xs font-mono mb-1">
              {this.props.label || 'Component'} crashed unexpectedly.
            </p>
            <p className="text-[#9C8E7E]/60 text-[10px] font-mono mb-4 break-all">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 text-[10px] font-mono uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded hover:bg-cyan-500/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
