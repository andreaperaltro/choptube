/**
 * Simple toast notification utility
 */

export interface ToastOptions {
  duration?: number; // Duration in ms
  type?: 'info' | 'warning' | 'error' | 'success';
}

/**
 * Show a toast notification
 * @param message - Message to display
 * @param options - Toast options
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const { duration = 3000, type = 'info' } = options;
  
  // Create toast element
  const toast = document.createElement('div');
  toast.textContent = message;
  
  // Style the toast
  const baseStyles = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(8px);
    transition: all 0.3s ease;
    transform: translateX(100%);
    opacity: 0;
  `;
  
  const typeStyles = {
    info: 'background: rgba(59, 130, 246, 0.9); color: white; border: 1px solid rgba(59, 130, 246, 0.5);',
    success: 'background: rgba(34, 197, 94, 0.9); color: white; border: 1px solid rgba(34, 197, 94, 0.5);',
    warning: 'background: rgba(245, 158, 11, 0.9); color: white; border: 1px solid rgba(245, 158, 11, 0.5);',
    error: 'background: rgba(239, 68, 68, 0.9); color: white; border: 1px solid rgba(239, 68, 68, 0.5);'
  };
  
  toast.style.cssText = baseStyles + typeStyles[type];
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });
  
  // Auto remove
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}
