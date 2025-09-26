/**
 * Policy Guard
 * Handles autoplay policy violations with silent retry on next user interaction
 */

import { ensureGestureArmed } from './gestureLatch';
import { autoPreloadPlayer } from './youtube/autoPreload';

/**
 * Pending track for retry
 */
interface PendingTrack {
  trackId: string;
  player: unknown;
  firstCueTime?: number;
  retryCount: number;
}

/**
 * Policy Guard for handling autoplay policy violations
 */
class PolicyGuard {
  private pendingTracks: Map<string, PendingTrack> = new Map();
  private retryListener: (() => void) | null = null;
  private maxRetries = 3;

  /**
   * Register a track for silent retry on next user interaction
   */
  registerPendingTrack(
    trackId: string, 
    player: unknown, 
    firstCueTime?: number
  ): void {
    const existing = this.pendingTracks.get(trackId);
    const retryCount = existing ? existing.retryCount + 1 : 0;
    
    if (retryCount >= this.maxRetries) {
      console.debug(`PolicyGuard: Max retries reached for ${trackId}, giving up`);
      this.pendingTracks.delete(trackId);
      return;
    }

    this.pendingTracks.set(trackId, {
      trackId,
      player,
      firstCueTime,
      retryCount
    });

    console.debug(`PolicyGuard: Registered ${trackId} for retry (attempt ${retryCount + 1})`);
    
    // Set up one-shot listener if not already active
    this.setupRetryListener();
  }

  /**
   * Set up one-shot listener for next user interaction
   */
  private setupRetryListener(): void {
    if (this.retryListener) {
      return; // Already listening
    }

    const handleUserInteraction = () => {
      console.debug('PolicyGuard: User interaction detected, retrying pending tracks');
      
      // Ensure gesture is armed
      ensureGestureArmed();
      
      // Retry all pending tracks
      this.retryPendingTracks();
      
      // Clean up listener
      this.removeRetryListener();
    };

    // Listen for various user interaction events
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });

    this.retryListener = handleUserInteraction;
    console.debug('PolicyGuard: Listening for next user interaction');
  }

  /**
   * Retry all pending tracks
   */
  private async retryPendingTracks(): Promise<void> {
    const tracksToRetry = Array.from(this.pendingTracks.values());
    
    if (tracksToRetry.length === 0) {
      return;
    }

    console.debug(`PolicyGuard: Retrying ${tracksToRetry.length} pending tracks`);

    for (const track of tracksToRetry) {
      try {
        const isReady = await autoPreloadPlayer(
          track.player, 
          track.trackId, 
          track.firstCueTime
        );
        
        if (isReady) {
          console.debug(`PolicyGuard: Retry successful for ${track.trackId}`);
          this.pendingTracks.delete(track.trackId);
        } else {
          console.debug(`PolicyGuard: Retry partial for ${track.trackId}, will retry again`);
        }
      } catch (error) {
        console.debug(`PolicyGuard: Retry failed for ${track.trackId}:`, error);
        // Track remains in pendingTracks for next retry
      }
    }
  }

  /**
   * Remove retry listener
   */
  private removeRetryListener(): void {
    if (this.retryListener) {
      // Note: We used { once: true } so listeners auto-remove
      this.retryListener = null;
      console.debug('PolicyGuard: Retry listener removed');
    }
  }

  /**
   * Clear all pending tracks
   */
  clearPendingTracks(): void {
    this.pendingTracks.clear();
    this.removeRetryListener();
    console.debug('PolicyGuard: Cleared all pending tracks');
  }

  /**
   * Get pending tracks count
   */
  getPendingCount(): number {
    return this.pendingTracks.size;
  }

  /**
   * Check if track is pending retry
   */
  isTrackPending(trackId: string): boolean {
    return this.pendingTracks.has(trackId);
  }
}

// Export singleton instance
export const policyGuard = new PolicyGuard();
