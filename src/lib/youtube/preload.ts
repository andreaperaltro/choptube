/**
 * YouTube Preload Manager
 * Centralized preload pipeline for YouTube tracks to minimize playback lag
 * Optimized for cross-browser compatibility, especially iOS Safari
 */

import { isPlayerReady } from './api';
import { useDiagnosticsStore } from '@/store/diagnostics';
import { PRELOAD_CONFIG } from '@/lib/config';

/**
 * Preload configuration constants (re-exported from config)
 */
export const PREROLL_DURATION_MS = PRELOAD_CONFIG.PREROLL_DURATION_MS;
export const PREROLL_BACK_SECONDS = PRELOAD_CONFIG.PREROLL_BACK_SECONDS;
export const LOOKAHEAD_MS = PRELOAD_CONFIG.LOOKAHEAD_MS;
export const READY_THRESHOLD_FRACTION = PRELOAD_CONFIG.READY_THRESHOLD_FRACTION;

/**
 * iOS Safari detection
 */
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|OPiOS|mercury/.test(userAgent);
  
  return isIOS && isSafari;
};

/**
 * Check if autoplay is blocked (iOS Safari or other restrictions)
 */
const isAutoplayBlocked = (): boolean => {
  return isIOSSafari();
};

/**
 * YouTube Player interface for preload operations
 */
interface YouTubePlayer {
  setVolume(volume: number): void;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  getVideoLoadedFraction(): number;
}

/**
 * Preload result summary
 */
export interface PreloadSummary {
  total: number;
  readyCount: number;
  errors: Record<string, string>;
  needsGesture?: boolean; // True if user gesture is required for autoplay
}

/**
 * Preload manager for YouTube players
 */
export class PreloadManager {
  /**
   * Arm all players for optimal playback readiness
   * @param playersByTrackId Map of track IDs to YouTube player instances
   * @param firstCueTimes Record of first cue times for each track (in seconds)
   * @returns Promise with preload summary
   */
  async armAll(
    playersByTrackId: Map<string, unknown>, 
    firstCueTimes: Record<string, number | undefined>
  ): Promise<PreloadSummary> {
    const results: PreloadSummary = {
      total: playersByTrackId.size,
      readyCount: 0,
      errors: {},
      needsGesture: false
    };

    if (results.total === 0) {
      return results;
    }

    // Check if we're on iOS Safari and might need user gesture
    const isIOS = isIOSSafari();
    if (isIOS) {
      console.log('🍎 iOS Safari detected - ensuring autoplay compatibility');
    }

    const preloadPromises = Array.from(playersByTrackId.entries()).map(
      async ([trackId, player]) => {
        try {
          await this.preloadPlayer(trackId, player, firstCueTimes[trackId]);
          results.readyCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          results.errors[trackId] = errorMessage;
          
          // Check if this is an autoplay/gesture error
          if (errorMessage.includes('Autoplay blocked') || errorMessage.includes('user gesture')) {
            results.needsGesture = true;
          }
        }
      }
    );

    await Promise.allSettled(preloadPromises);
    return results;
  }

  /**
   * Preload a single player
   * @param trackId Track identifier
   * @param player YouTube player instance
   * @param firstCueTime First cue time in seconds (optional)
   */
  private async preloadPlayer(
    trackId: string, 
    player: unknown, 
    firstCueTime?: number
  ): Promise<void> {
    if (!isPlayerReady(player)) {
      throw new Error('Player not ready');
    }

    const ytPlayer = player as YouTubePlayer;
    const isIOS = isIOSSafari();
    const diagnostics = useDiagnosticsStore.getState();
    
    try {
      // 1. Ensure player is muted for preload (critical for iOS Safari)
      ytPlayer.setVolume(0);
      if (!ytPlayer.isMuted()) {
        ytPlayer.mute();
      }

      // 2. Set playback rate to current per-track rate (default 1.0)
      const currentRate = ytPlayer.getPlaybackRate() || 1.0;
      ytPlayer.setPlaybackRate(currentRate);

      // 3. Seek to pre-roll position using configurable constant
      const preRollTime = Math.max((firstCueTime ?? 0) - PREROLL_BACK_SECONDS, 0);
      ytPlayer.seekTo(preRollTime, true);

      // 4. Brief play/pause cycle to encourage buffering
      try {
        ytPlayer.playVideo();
      } catch (playError) {
        // Handle autoplay policy blocking with iOS-specific messaging
        if (playError instanceof Error) {
          if (playError.message.includes('play') || playError.message.includes('autoplay')) {
            if (isIOS) {
              throw new Error('Autoplay blocked on iOS Safari - user interaction required');
            } else {
              throw new Error('Autoplay blocked - user interaction required');
            }
          }
        }
        throw playError;
      }
      
      // Wait for buffering to start with configurable duration
      await this.waitForBuffering(ytPlayer, PREROLL_DURATION_MS);
      
      // Pause after brief preload
      ytPlayer.pauseVideo();

      // 5. Verify player is ready (not stuck in buffering)
      await this.verifyPlayerReady(ytPlayer, trackId);

      // Record successful preload in diagnostics
      const loadedFraction = ytPlayer.getVideoLoadedFraction();
      if (diagnostics.isEnabled) {
        diagnostics.recordPreloadAttempt(trackId, true, loadedFraction);
      }

    } catch (error) {
      // Record failed preload in diagnostics
      const loadedFraction = ytPlayer.getVideoLoadedFraction();
      if (diagnostics.isEnabled) {
        diagnostics.recordPreloadAttempt(trackId, false, loadedFraction, error instanceof Error ? error.message : String(error));
      }
      throw new Error(`Preload failed for track ${trackId}: ${error}`);
    }
  }

  /**
   * Wait for player to start buffering
   * @param player YouTube player instance
   * @param maxWaitMs Maximum wait time in milliseconds
   */
  private async waitForBuffering(player: YouTubePlayer, maxWaitMs: number): Promise<void> {
    const startTime = Date.now();
    let lastLoadedFraction = 0;
    let noProgressCount = 0;
    
    while (Date.now() - startTime < maxWaitMs) {
      const state = player.getPlayerState();
      const loadedFraction = player.getVideoLoadedFraction();
      
      // YouTube PlayerState.BUFFERING = 3
      if (state === 3) {
        return;
      }
      
      // Check for network issues - if loaded fraction never increases
      if (Math.abs(loadedFraction - lastLoadedFraction) < 0.001) {
        noProgressCount++;
        if (noProgressCount > 10) { // 500ms with no progress
          throw new Error('Network timeout - no buffering progress detected');
        }
      } else {
        noProgressCount = 0;
        lastLoadedFraction = loadedFraction;
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Verify player is ready after preload
   * @param player YouTube player instance
   * @param trackId Track identifier for error messages
   */
  private async verifyPlayerReady(player: YouTubePlayer, trackId: string): Promise<void> {
    // Wait a bit for player to stabilize
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const state = player.getPlayerState();
    const loadedFraction = player.getVideoLoadedFraction();
    
    // Player should not be stuck in buffering state
    if (state === 3) { // BUFFERING
      throw new Error(`Player stuck in buffering state`);
    }
    
    // Should have sufficient content loaded using configurable threshold
    if (loadedFraction < READY_THRESHOLD_FRACTION) {
      throw new Error(`Insufficient content loaded (${(loadedFraction * 100).toFixed(1)}%, need ${(READY_THRESHOLD_FRACTION * 100).toFixed(1)}%)`);
    }
  }

  /**
   * Get loaded fraction of a player
   * @param player YouTube player instance
   * @returns Loaded fraction (0-1) or 0 if not available
   */
  getLoadedFraction(player: unknown): number {
    if (!isPlayerReady(player)) {
      return 0;
    }

    const ytPlayer = player as YouTubePlayer;
    try {
      return ytPlayer.getVideoLoadedFraction();
    } catch (error) {
      console.warn('Failed to get loaded fraction:', error);
      return 0;
    }
  }

  /**
   * Check if a player is ready for playback
   * @param player YouTube player instance
   * @returns true if player is ready
   */
  isReady(player: unknown): boolean {
    if (!isPlayerReady(player)) {
      return false;
    }

    const ytPlayer = player as YouTubePlayer;
    try {
      const loadedFraction = ytPlayer.getVideoLoadedFraction();
      const state = ytPlayer.getPlayerState();
      
      // Ready if we have sufficient content loaded and not buffering
      return loadedFraction > READY_THRESHOLD_FRACTION && state !== 3; // 3 = BUFFERING
    } catch (error) {
      console.warn('Failed to check player readiness:', error);
      return false;
    }
  }
}

// Export singleton instance
export const preloadManager = new PreloadManager();
