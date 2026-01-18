/**
 * Phase11ErrorBoundary - Error boundary for Phase 11 Canvas
 *
 * Catches React errors in the 3D visualization to prevent black screen crashes.
 * Provides user-friendly error recovery.
 */

import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class Phase11ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Phase11ErrorBoundary] Caught error:', error);
    console.error('[Phase11ErrorBoundary] Error message:', error.message);
    console.error('[Phase11ErrorBoundary] Error stack:', error.stack);
    console.error('[Phase11ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Log to help debug hooks issues
    if (error.message.includes('hooks')) {
      console.error('[Phase11ErrorBoundary] Hooks error detected. This typically occurs when:');
      console.error('  1. A hook is called conditionally');
      console.error('  2. A hook is called inside a loop with varying iterations');
      console.error('  3. A component with hooks is conditionally rendered');
    }
  }

  handleReset = () => {
    // Call onReset first to reset navigation state
    this.props.onReset?.();
    // Then clear the error state after a microtask to avoid hooks mismatch
    setTimeout(() => {
      this.setState({ hasError: false, error: null });
    }, 0);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Visualization Error
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Something went wrong rendering the constellation view.
              {this.state.error && (
                <span className="block mt-2 text-xs text-slate-400 font-mono">
                  {this.state.error.message}
                </span>
              )}
            </p>
            <Button
              onClick={this.handleReset}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
