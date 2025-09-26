/**
 * Confirmation dialog utility
 * Provides simple confirmation dialogs for destructive actions
 */

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

/**
 * Show a confirmation dialog
 * @param options Confirmation dialog options
 * @returns Promise<boolean> - true if confirmed, false if cancelled
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const {
      title = 'Confirm Action',
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'warning'
    } = options;

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    backdrop.onclick = () => {
      cleanup();
      resolve(false);
    };

    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.className = 'bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-md w-full shadow-xl';
    dialog.onclick = (e) => e.stopPropagation();

    // Icon based on type
    const iconColors = {
      danger: 'text-red-500',
      warning: 'text-yellow-500',
      info: 'text-blue-500'
    };

    const icons = {
      danger: '⚠️',
      warning: '⚠️',
      info: 'ℹ️'
    };

    dialog.innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <div class="text-2xl">${icons[type]}</div>
        <h3 class="text-lg font-semibold text-white">${title}</h3>
      </div>
      <p class="text-gray-300 mb-6">${message}</p>
      <div class="flex gap-3 justify-end">
        <button id="cancel-btn" class="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 transition-colors">
          ${cancelText}
        </button>
        <button id="confirm-btn" class="px-4 py-2 text-sm font-medium text-white rounded transition-colors ${
          type === 'danger' 
            ? 'bg-red-600 hover:bg-red-700' 
            : type === 'warning'
            ? 'bg-yellow-600 hover:bg-yellow-700'
            : 'bg-blue-600 hover:bg-blue-700'
        }">
          ${confirmText}
        </button>
      </div>
    `;

    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    // Focus the confirm button
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    
    confirmBtn?.focus();

    const cleanup = () => {
      document.body.removeChild(backdrop);
    };

    // Handle button clicks
    confirmBtn?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    cancelBtn?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    // Handle escape key
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
        document.removeEventListener('keydown', handleKeydown);
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
  });
}

/**
 * Show a danger confirmation dialog
 */
export function showDangerConfirm(message: string, title?: string): Promise<boolean> {
  return showConfirm({
    title: title || 'Confirm Deletion',
    message,
    confirmText: 'Delete',
    type: 'danger'
  });
}

/**
 * Show a warning confirmation dialog
 */
export function showWarningConfirm(message: string, title?: string): Promise<boolean> {
  return showConfirm({
    title: title || 'Confirm Action',
    message,
    confirmText: 'Continue',
    type: 'warning'
  });
}
