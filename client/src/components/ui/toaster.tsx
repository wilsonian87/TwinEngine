/**
 * Toaster Component
 *
 * Container for toast notifications with brand styling.
 * Renders toasts from the use-toast hook.
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9F.1
 */

import { useToast } from '@/hooks/use-toast';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, showProgress, duration, ...props }) {
        return (
          <Toast
            key={id}
            variant={variant}
            showProgress={showProgress}
            duration={duration}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
