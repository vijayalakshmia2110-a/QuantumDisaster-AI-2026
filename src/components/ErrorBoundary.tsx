import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
          <div className="panel p-8 max-w-lg w-full text-center animate-slide-up">
            <div className="w-16 h-16 rounded-full bg-danger-500/15 border border-danger-500/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-danger-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-100 mb-2">Application Error</h2>
            <p className="text-slate-400 text-sm mb-1">
              An unexpected error occurred in this section of the application.
            </p>
            {this.state.error && (
              <p className="text-danger-400 text-xs font-mono mb-6 mt-2 break-words">
                {this.state.error.message}
              </p>
            )}
            <button onClick={this.handleReset} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
