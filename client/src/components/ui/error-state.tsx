/**
 * ErrorState Component
 *
 * Brand-aligned error displays with recovery options.
 * Errors feel recoverable, brand voice maintained (no "Oops!").
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9D.4
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff, ServerOff, ShieldOff, FileWarning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message/description */
  message?: string;
  /** Error type for icon selection */
  type?: 'network' | 'server' | 'auth' | 'notFound' | 'generic';
  /** Retry callback */
  retry?: () => void;
  /** Custom retry label */
  retryLabel?: string;
  /** Secondary action */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the icon */
  showIcon?: boolean;
}

// ============================================================================
// CONFIG
// ============================================================================

const typeConfig = {
  network: {
    icon: WifiOff,
    defaultTitle: 'Connection lost.',
    defaultMessage: 'Check your network and try again.',
  },
  server: {
    icon: ServerOff,
    defaultTitle: 'Service unavailable.',
    defaultMessage: 'We\'re working to restore service.',
  },
  auth: {
    icon: ShieldOff,
    defaultTitle: 'Session expired.',
    defaultMessage: 'Please sign in again to continue.',
  },
  notFound: {
    icon: FileWarning,
    defaultTitle: 'Resource not found.',
    defaultMessage: 'The requested item may have been moved or deleted.',
  },
  generic: {
    icon: AlertCircle,
    defaultTitle: 'Connection interrupted.',
    defaultMessage: 'Reconnecting now.',
  },
};

const sizeConfig = {
  sm: {
    container: 'py-6',
    iconWrapper: 'w-10 h-10',
    iconSize: 'w-5 h-5',
    title: 'text-sm',
    message: 'text-xs',
  },
  md: {
    container: 'py-12',
    iconWrapper: 'w-12 h-12',
    iconSize: 'w-6 h-6',
    title: 'text-base',
    message: 'text-sm',
  },
  lg: {
    container: 'py-16',
    iconWrapper: 'w-16 h-16',
    iconSize: 'w-8 h-8',
    title: 'text-lg',
    message: 'text-base',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Error state component for displaying recoverable errors.
 *
 * @example
 * // Basic usage with retry
 * <ErrorState
 *   title="Connection interrupted."
 *   message="Reconnecting now."
 *   retry={() => refetch()}
 * />
 *
 * @example
 * // Network error
 * <ErrorState type="network" retry={() => refetch()} />
 *
 * @example
 * // Auth error with custom action
 * <ErrorState
 *   type="auth"
 *   secondaryAction={{ label: "Sign In", onClick: () => login() }}
 * />
 */
export function ErrorState({
  title,
  message,
  type = 'generic',
  retry,
  retryLabel = 'Try Again',
  secondaryAction,
  size = 'md',
  className,
  showIcon = true,
}: ErrorStateProps) {
  const typeSettings = typeConfig[type];
  const sizeStyles = sizeConfig[size];
  const Icon = typeSettings.icon;

  const displayTitle = title || typeSettings.defaultTitle;
  const displayMessage = message || typeSettings.defaultMessage;

  return (
    <motion.div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles.container,
        className
      )}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Icon */}
      {showIcon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-error-red/10 mb-4',
            sizeStyles.iconWrapper
          )}
        >
          <Icon className={cn('text-error-red', sizeStyles.iconSize)} />
        </div>
      )}

      {/* Title */}
      <h3 className={cn('font-semibold text-signal-white mb-1', sizeStyles.title)}>
        {displayTitle}
      </h3>

      {/* Message */}
      <p className={cn('text-data-gray mb-4 max-w-sm', sizeStyles.message)}>
        {displayMessage}
      </p>

      {/* Actions */}
      {(retry || secondaryAction) && (
        <div className="flex items-center gap-3">
          {retry && (
            <Button onClick={retry} variant="ghost" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              {retryLabel}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="default" size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// INLINE ERROR
// ============================================================================

interface InlineErrorProps {
  message: string;
  retry?: () => void;
  className?: string;
}

/**
 * Inline error for forms and small sections.
 */
export function InlineError({ message, retry, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-error-red text-sm p-3 rounded-lg bg-error-red/10',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {retry && (
        <button
          onClick={retry}
          className="text-xs underline hover:no-underline shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// ============================================================================
// ERROR BOUNDARY FALLBACK
// ============================================================================

interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

/**
 * Fallback component for React Error Boundaries.
 */
export function ErrorBoundaryFallback({ error, resetErrorBoundary }: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <ErrorState
        title="Something went wrong."
        message={error?.message || 'An unexpected error occurred.'}
        type="generic"
        retry={resetErrorBoundary}
        retryLabel="Reload"
        size="lg"
      />
    </div>
  );
}

// ============================================================================
// NETWORK STATUS INDICATOR
// ============================================================================

interface OfflineIndicatorProps {
  className?: string;
}

/**
 * Offline status indicator bar.
 */
export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  return (
    <motion.div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-error-red px-4 py-2 text-center text-sm text-signal-white',
        className
      )}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>Connection lost. Attempting to reconnect...</span>
      </div>
    </motion.div>
  );
}

// ============================================================================
// QUERY ERROR HANDLER
// ============================================================================

interface QueryErrorProps {
  error: Error | null;
  retry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Error state for React Query errors.
 * Automatically detects error type from error message.
 */
export function QueryError({ error, retry, size = 'md', className }: QueryErrorProps) {
  if (!error) return null;

  const errorMessage = error.message.toLowerCase();
  let type: ErrorStateProps['type'] = 'generic';

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    type = 'network';
  } else if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    type = 'auth';
  } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    type = 'notFound';
  } else if (errorMessage.includes('500') || errorMessage.includes('server')) {
    type = 'server';
  }

  return (
    <ErrorState
      type={type}
      message={error.message}
      retry={retry}
      size={size}
      className={className}
    />
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ErrorState;
