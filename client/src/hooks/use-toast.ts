/**
 * useToast Hook
 *
 * Toast notification state management with helper functions
 * for different toast variants (success, error, info, etc.).
 *
 * @see ROADMAP-PHASE9-INTERACTION-EXPERIENCE.md M9F.1
 */

import * as React from 'react';

import type { ToastActionElement, ToastProps } from '@/components/ui/toast';

// ============================================================================
// CONSTANTS
// ============================================================================

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1000;

// Default durations by variant
const DEFAULT_DURATIONS = {
  default: 5000,
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 5000,
  loading: Infinity, // Loading toasts don't auto-dismiss
  destructive: 6000,
} as const;

// ============================================================================
// TYPES
// ============================================================================

type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading' | 'destructive';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: ToastVariant;
  showProgress?: boolean;
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType['ADD_TOAST'];
      toast: ToasterToast;
    }
  | {
      type: ActionType['UPDATE_TOAST'];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType['DISMISS_TOAST'];
      toastId?: ToasterToast['id'];
    }
  | {
      type: ActionType['REMOVE_TOAST'];
      toastId?: ToasterToast['id'];
    };

interface State {
  toasts: ToasterToast[];
}

// ============================================================================
// REDUCER
// ============================================================================

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: 'REMOVE_TOAST',
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case 'DISMISS_TOAST': {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

// ============================================================================
// TOAST FUNCTION
// ============================================================================

type Toast = Omit<ToasterToast, 'id'>;

function toast({ variant = 'default', duration, showProgress = true, ...props }: Toast) {
  const id = genId();
  const toastDuration = duration ?? DEFAULT_DURATIONS[variant];

  const update = (props: ToasterToast) =>
    dispatch({
      type: 'UPDATE_TOAST',
      toast: { ...props, id },
    });
  const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

  dispatch({
    type: 'ADD_TOAST',
    toast: {
      ...props,
      id,
      variant,
      duration: toastDuration,
      showProgress: variant !== 'loading' ? showProgress : false,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Show a success toast
 */
toast.success = (title: string, description?: string) => {
  return toast({
    variant: 'success',
    title,
    description,
  });
};

/**
 * Show an error toast
 */
toast.error = (title: string, description?: string) => {
  return toast({
    variant: 'error',
    title,
    description,
  });
};

/**
 * Show a warning toast
 */
toast.warning = (title: string, description?: string) => {
  return toast({
    variant: 'warning',
    title,
    description,
  });
};

/**
 * Show an info toast
 */
toast.info = (title: string, description?: string) => {
  return toast({
    variant: 'info',
    title,
    description,
  });
};

/**
 * Show a loading toast (doesn't auto-dismiss)
 * Returns an object with dismiss function
 */
toast.loading = (title: string, description?: string) => {
  return toast({
    variant: 'loading',
    title,
    description,
    duration: Infinity,
    showProgress: false,
  });
};

/**
 * Show a promise-based toast
 * Shows loading, then success/error based on promise result
 */
toast.promise = async <T>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  }
): Promise<T> => {
  const toastId = toast.loading(loading);

  try {
    const result = await promise;
    const successMessage = typeof success === 'function' ? success(result) : success;
    toastId.update({
      id: toastId.id,
      variant: 'success',
      title: successMessage,
      duration: DEFAULT_DURATIONS.success,
      showProgress: true,
    });
    return result;
  } catch (err) {
    const errorMessage = typeof error === 'function' ? error(err) : error;
    toastId.update({
      id: toastId.id,
      variant: 'error',
      title: errorMessage,
      duration: DEFAULT_DURATIONS.error,
      showProgress: true,
    });
    throw err;
  }
};

// ============================================================================
// HOOK
// ============================================================================

function useToast() {
  const [state, setState] = React.useState<State>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export { useToast, toast };
