/**
 * Auto Preload Utility
 * Handles automatic preloading with autoplay policy compliance
 */

import { isPlayerReady } from './api';
import { policyGuard } from '../PolicyGuard';
import { PRELOAD_CONFIG } from '@/lib/config';

/**
 * Auto-preload a YouTube player with muted preroll
 * @param player YouTube player instance
 * @param trackId Track identifier
 * @param firstCueTime First cue time in seconds (optional)
 * @returns Promise that resolves when preload is complete
 */
export async function autoPreloadPlayer(
  player: unknown,
  trackId: string,
  firstCueTime?: number
): Promise<boolean> {
  if (!isPlayerReady(player)) {
    console.warn(`Player not ready for auto-preload: ${trackId}`);
    return false;
  }

  const ytPlayer = player as any;
  
  try {
    // 1. Ensure player is muted for autoplay compliance
    ytPlayer.setVolume(0);
    if (!ytPlayer.isMuted()) {
      ytPlayer.mute();
    }

    // 2. Set playback rate to current per-track rate (default 1.0)
    const currentRate = ytPlayer.getPlaybackRate() || 1.0;
    ytPlayer.setPlaybackRate(currentRate);

    // 3. Seek to pre-roll position (configurable seconds before first cue, minimum 0)
    const preRollTime = Math.max((firstCueTime ?? 0) - PRELOAD_CONFIG.PREROLL_BACK_SECONDS, 0);
    ytPlayer.seekTo(preRollTime, true);

    // 4. Brief muted play/pause cycle to encourage buffering
    try {
      ytPlayer.playVideo();
    } catch (playError) {
      // Handle autoplay policy blocking gracefully
      if (playError instanceof Error && 
          (playError.message.includes('play') || playError.message.includes('autoplay'))) {
        console.debug(`PolicyGuard: Autoplay blocked for ${trackId}, registering for retry`);
        policyGuard.registerPendingTrack(trackId, player, firstCueTime);
        return false;
      }
      throw playError;
    }
    
    // 5. Wait for buffering with timeout (configurable max)
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Preroll timeout - exceeded ${PRELOAD_CONFIG.PREROLL_TIMEOUT_MS}ms without reaching non-BUFFERING state`));
      }, PRELOAD_CONFIG.PREROLL_TIMEOUT_MS);
    });

    const prerollPromise = waitForNonBuffering(ytPlayer);
    
    try {
      await Promise.race([prerollPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.debug(`PolicyGuard: Preroll timeout for ${trackId}, registering for retry`);
      policyGuard.registerPendingTrack(trackId, player, firstCueTime);
      return false;
    }
    
    // 6. Pause after brief preload
    ytPlayer.pauseVideo();

    // 7. Unmute the player after preload is complete
    ytPlayer.unMute();
    ytPlayer.setVolume(100); // Set to full volume

    // 8. Verify player is ready
    const loadedFraction = ytPlayer.getVideoLoadedFraction();
    const isReady = loadedFraction > PRELOAD_CONFIG.READY_THRESHOLD_FRACTION; // Configurable threshold
    
    if (isReady) {
      console.log(`✅ Auto-preload successful: ${trackId} (${(loadedFraction * 100).toFixed(1)}% loaded)`);
    } else {
      console.warn(`⚠️ Auto-preload partial: ${trackId} (${(loadedFraction * 100).toFixed(1)}% loaded)`);
    }
    
    return isReady;

  } catch (error) {
    console.warn(`❌ Auto-preload failed for ${trackId}:`, error);
    return false;
  }
}

/**
 * Wait for player to reach non-BUFFERING state
 * @param player YouTube player instance
 * @returns Promise that resolves when player is not buffering
 */
async function waitForNonBuffering(player: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const checkState = () => {
      try {
        const state = player.getPlayerState();
        // 3 = BUFFERING, 1 = PLAYING, 2 = PAUSED, 5 = CUED
        if (state !== 3) { // Not buffering
          resolve();
        } else {
          // Still buffering, check again in 100ms
          setTimeout(checkState, 100);
        }
      } catch (error) {
        reject(error);
      }
    };
    
    // Start checking after a brief delay to allow play() to take effect
    setTimeout(checkState, 100);
  });
}

/**
 * Auto-preload multiple players with cap
 * @param players Map of track IDs to YouTube player instances
 * @param firstCueTimes Record of first cue times for each track
 * @param maxPlayers Maximum number of players to preload (default: 4)
 * @returns Promise with results summary
 */
export async function autoPreloadMultiple(
  players: Map<string, unknown>,
  firstCueTimes: Record<string, number | undefined>,
  maxPlayers: number = PRELOAD_CONFIG.MAX_HIDDEN_PRELOADED_PLAYERS
): Promise<{ success: string[]; failed: string[]; skipped: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];
  const skipped: string[] = [];

  // Limit to max players to avoid too many iframes
  const playersToPreload = Array.from(players.entries()).slice(0, maxPlayers);
  const excessPlayers = Array.from(players.entries()).slice(maxPlayers);
  
  // Mark excess players as skipped
  excessPlayers.forEach(([trackId]) => skipped.push(trackId));

  console.log(`🎵 Auto-preloading ${playersToPreload.length} players (capped at ${maxPlayers})`);

  // Preload each player
  for (const [trackId, player] of playersToPreload) {
    try {
      const isReady = await autoPreloadPlayer(player, trackId, firstCueTimes[trackId]);
      if (isReady) {
        success.push(trackId);
      } else {
        failed.push(trackId);
      }
    } catch (error) {
      console.warn(`Auto-preload failed for ${trackId}:`, error);
      failed.push(trackId);
    }
  }

  console.log(`🎵 Auto-preload complete: ${success.length} success, ${failed.length} failed, ${skipped.length} skipped`);
  
  return { success, failed, skipped };
}
