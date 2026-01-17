/**
 * Toast Components
 *
 * Brand-aligned toast notifications with variants for
 * success, error, info, warning, and loading states.
 * Features progress bar and smooth animations.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9F.1
 */

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import { X, CheckCircle, AlertCircle, Info, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// PROVIDER
// ============================================================================

const ToastProvider = ToastPrimitives.Provider;

// ============================================================================
// VIEWPORT
// ============================================================================

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// ============================================================================
// TOAST VARIANTS
// ============================================================================

const toastVariants = cva(
  cn(
    'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl p-4 pr-10 shadow-lg',
    'border backdrop-blur-sm',
    'transition-all duration-300',
    'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
    'data-[state=open]:animate-toast-slide-in data-[state=closed]:animate-toast-slide-out'
  ),
  {
    variants: {
      variant: {
        default: [
          'bg-void-black/95 border-border-gray text-signal-white',
        ].join(' '),
        success: [
          'bg-void-black/95 border-emerald-500/30 text-signal-white',
        ].join(' '),
        error: [
          'bg-void-black/95 border-red-500/30 text-signal-white',
        ].join(' '),
        warning: [
          'bg-void-black/95 border-amber-500/30 text-signal-white',
        ].join(' '),
        info: [
          'bg-void-black/95 border-consumption-purple/30 text-signal-white',
        ].join(' '),
        loading: [
          'bg-void-black/95 border-border-gray text-signal-white',
        ].join(' '),
        destructive: [
          'bg-void-black/95 border-red-500/30 text-signal-white',
        ].join(' '),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

// ============================================================================
// ICON CONFIG
// ============================================================================

const variantIcons = {
  default: null,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
  destructive: AlertCircle,
};

const variantIconColors = {
  default: 'text-muted-gray',
  success: 'text-emerald-400',
  error: 'text-red-400',
  warning: 'text-amber-400',
  info: 'text-consumption-purple',
  loading: 'text-muted-gray animate-spin',
  destructive: 'text-red-400',
};

// ============================================================================
// TOAST
// ============================================================================

export interface ToastProps
  extends React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root>,
    VariantProps<typeof toastVariants> {
  /** Show progress bar for auto-dismiss */
  showProgress?: boolean;
  /** Duration in ms for auto-dismiss (default: 5000) */
  duration?: number;
}

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  ToastProps
>(({ className, variant, showProgress, duration = 5000, children, ...props }, ref) => {
  const Icon = variant ? variantIcons[variant] : null;
  const iconColor = variant ? variantIconColors[variant] : '';

  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      duration={duration}
      {...props}
    >
      {/* Icon */}
      {Icon && (
        <div className="shrink-0 pt-0.5">
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* Progress bar for auto-dismiss */}
      {showProgress && variant !== 'loading' && (
        <ToastProgress duration={duration} variant={variant} />
      )}
    </ToastPrimitives.Root>
  );
});
Toast.displayName = ToastPrimitives.Root.displayName;

// ============================================================================
// PROGRESS BAR
// ============================================================================

interface ToastProgressProps {
  duration: number;
  variant?: VariantProps<typeof toastVariants>['variant'];
}

function ToastProgress({ duration, variant }: ToastProgressProps) {
  const [progress, setProgress] = React.useState(100);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const decrement = 100 / (duration / 50);
        return Math.max(0, prev - decrement);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration, isPaused]);

  const progressColor = {
    default: 'bg-muted-gray',
    success: 'bg-emerald-400',
    error: 'bg-red-400',
    warning: 'bg-amber-400',
    info: 'bg-consumption-purple',
    loading: 'bg-muted-gray',
    destructive: 'bg-red-400',
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-1 bg-border-gray/30 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className={cn(
          'h-full transition-all duration-50 ease-linear',
          variant ? progressColor[variant] : progressColor.default
        )}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ============================================================================
// TOAST ACTION
// ============================================================================

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-3',
      'text-xs font-medium',
      'bg-border-gray/50 text-signal-white',
      'hover:bg-border-gray transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-consumption-purple focus:ring-offset-2 focus:ring-offset-void-black',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

// ============================================================================
// TOAST CLOSE
// ============================================================================

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-3 top-3 rounded-md p-1',
      'text-muted-gray opacity-70',
      'hover:text-signal-white hover:opacity-100',
      'focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-consumption-purple',
      'transition-all',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

// ============================================================================
// TOAST TITLE
// ============================================================================

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold text-signal-white', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

// ============================================================================
// TOAST DESCRIPTION
// ============================================================================

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm text-data-gray', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

// ============================================================================
// TYPES
// ============================================================================

type ToastActionElement = React.ReactElement<typeof ToastAction>;

// ============================================================================
// EXPORTS
// ============================================================================

export {
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
