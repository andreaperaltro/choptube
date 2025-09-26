/**
 * Toast notification utility
 * Provides simple toast notifications with different types
 */

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export type ToastMessage = string | React.ReactNode;

let toastCallback: ((message: ToastMessage, options?: ToastOptions) => void) | null = null;

/**
 * Register a toast callback function
 * This should be called from a component that manages toast state
 */
export function registerToast(callback: (message: ToastMessage, options?: ToastOptions) => void) {
  toastCallback = callback;
}

/**
 * Show a toast notification
 * @param message The message to display
 * @param options Toast options (type, duration)
 */
export function showToast(message: ToastMessage, options?: ToastOptions) {
  if (toastCallback) {
    toastCallback(message, options);
  } else {
    console.warn('Toast callback not registered. Message:', message);
  }
}

/**
 * Show a success toast
 */
export function showSuccess(message: ToastMessage, duration?: number) {
  showToast(message, { type: 'success', duration });
}

/**
 * Show an error toast
 */
export function showError(message: ToastMessage, duration?: number) {
  showToast(message, { type: 'error', duration });
}

/**
 * Show a warning toast
 */
export function showWarning(message: ToastMessage, duration?: number) {
  showToast(message, { type: 'warning', duration });
}

/**
 * Show an info toast
 */
export function showInfo(message: ToastMessage, duration?: number) {
  showToast(message, { type: 'info', duration });
}