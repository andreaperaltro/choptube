/**
 * Feature Flags
 * Controls visibility of advanced UI elements
 */

/**
 * Check if DEV UI should be enabled
 * Returns true if URL has ?dev=1 OR localStorage has choptube.dev=1
 */
export function isDevUI(): boolean {
  // Check URL parameter first (takes precedence)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('dev') === '1') {
      return true;
    }
    
    // Check localStorage flag
    const devFlag = localStorage.getItem('choptube.dev');
    if (devFlag === '1') {
      return true;
    }
  }
  
  return false;
}

/**
 * Set DEV UI flag in localStorage
 * @param on - Whether to enable DEV UI
 */
export function setDevUI(on: boolean): void {
  if (typeof window !== 'undefined') {
    if (on) {
      localStorage.setItem('choptube.dev', '1');
    } else {
      localStorage.removeItem('choptube.dev');
    }
  }
}

/**
 * Toggle DEV UI flag
 */
export function toggleDevUI(): boolean {
  const currentState = isDevUI();
  setDevUI(!currentState);
  return !currentState;
}

/**
 * Get current DEV UI state as string for debugging
 */
export function getDevUIState(): string {
  if (typeof window === 'undefined') {
    return 'SSR';
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const urlFlag = urlParams.get('dev') === '1';
  const localStorageFlag = localStorage.getItem('choptube.dev') === '1';
  
  return `URL: ${urlFlag}, localStorage: ${localStorageFlag}, Result: ${isDevUI()}`;
}
