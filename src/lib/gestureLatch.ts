/**
 * Gesture Latch
 * Ensures user gesture is captured for autoplay policy compliance
 * No UI - works silently in the background
 */

let armed = false;
let audioContext: AudioContext | null = null;

/**
 * Ensure user gesture is armed for autoplay
 * Call this synchronously at the start of user-initiated actions
 * (URL submission, playlist import, etc.)
 */
export function ensureGestureArmed(): void {
  if (armed) {
    return;
  }

  try {
    // Create or resume AudioContext to capture user gesture
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume AudioContext if suspended (captures user gesture)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    // Mark as armed
    armed = true;
    
    console.log('🎵 Gesture armed for autoplay compliance');
    
  } catch (error) {
    console.warn('Failed to arm gesture for autoplay:', error);
    // Don't throw - continue with operation even if gesture arming fails
  }
}

/**
 * Check if gesture is currently armed
 */
export function isGestureArmed(): boolean {
  return armed;
}

/**
 * Reset gesture state (for testing or manual reset)
 */
export function resetGestureArmed(): void {
  armed = false;
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
