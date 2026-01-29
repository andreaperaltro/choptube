/**
 * YouTube API helper functions
 * Provides safe wrappers around YouTube player methods
 */

// YouTube Player interface based on the YouTube IFrame API
interface YouTubePlayer {
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  playVideo(): void;
  pauseVideo(): void;
  getPlayerState(): number;
  getVideoLoadedFraction(): number;
  setVolume(volume: number): void;
  getVolume(): number;
  isMuted(): boolean;
  mute(): void;
  unMute(): void;
}

/**
 * Check if a YouTube player is ready and has all required methods
 * @param player - YouTube player instance
 * @returns true if player is ready, false otherwise
 */
export function isPlayerReady(player: unknown): boolean {
  if (!player) return false;
  
  // Check for essential methods
  const requiredMethods = ['setPlaybackRate', 'getCurrentTime', 'getDuration'];
  return requiredMethods.every(method => typeof (player as Record<string, unknown>)[method] === 'function');
}

/**
 * Apply playback rate to a YouTube player
 * @param player - YouTube player instance
 * @param rate - Playback rate (0.25 to 2.0)
 * @param onError - Optional callback for handling errors
 * @returns true if successful, false if failed
 */
export function applyPlaybackRate(
  player: unknown, 
  rate: number, 
  onError?: (error: string) => void
): boolean {
  // Ultra-safe rate application with comprehensive checks
  if (!player) {
    console.warn('Player is null or undefined - skipping rate application');
    return false;
  }

  if (typeof player !== 'object') {
    console.warn('Player is not an object - skipping rate application');
    return false;
  }

  const typedPlayer = player as YouTubePlayer;
  
  if (!typedPlayer.setPlaybackRate || typeof typedPlayer.setPlaybackRate !== 'function') {
    console.warn('Player does not have setPlaybackRate method - skipping rate application');
    return false;
  }

  try {
    // Clamp rate to YouTube's allowed range
    const clampedRate = Math.max(0.25, Math.min(2.0, rate));
    
    // Apply the rate
    typedPlayer.setPlaybackRate(clampedRate);
    
    // Optional verification (log only – do not revert store; YouTube can report delayed values)
    setTimeout(() => {
      try {
        const actualRate = typedPlayer.getPlaybackRate?.();
        if (actualRate != null && Math.abs(actualRate - clampedRate) > 0.01) {
          console.warn(`Rate ${clampedRate}x may not be supported on this video (reported ${actualRate}x)`);
          // Do not call onError here – it was reverting the user's choice
        }
      } catch {
        // Ignore
      }
    }, 150);
    
    // Log only significant changes
    if (Math.abs(clampedRate - 1) > 0.01) {
      console.log(`🎬 Applied playback rate ${clampedRate}x`);
    }
    
    return true;
    
  } catch (error) {
    const errorMsg = `Failed to set playback rate: ${error}`;
    console.error('❌', errorMsg);
    if (onError) {
      onError('Rate not supported on this video');
    }
    return false;
  }
}

/**
 * Apply playback rates to multiple players
 * @param players - Array of YouTube player instances
 * @param rates - Array of playback rates (must match players length)
 */
export function applyPlaybackRateToAll(players: unknown[], rates: number[]): void {
  if (!players || players.length === 0) {
    console.warn('No players provided to applyPlaybackRateToAll');
    return;
  }

  if (players.length !== rates.length) {
    console.warn('Players and rates arrays must have the same length');
    return;
  }

  players.forEach((player, index) => {
    if (isPlayerReady(player)) {
      applyPlaybackRate(player, rates[index]);
    } else {
      console.warn(`Player at index ${index} is not ready or invalid`);
    }
  });
}

/**
 * Apply playback rate with retry mechanism
 * @param player - YouTube player instance
 * @param rate - Playback rate (0.25 to 2.0)
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param delay - Delay between retries in ms (default: 500)
 */
export function applyPlaybackRateWithRetry(
  player: unknown, 
  rate: number, 
  maxRetries: number = 3, 
  delay: number = 500
): void {
  let retryCount = 0;
  
  const attemptApply = () => {
    if (isPlayerReady(player)) {
      try {
        applyPlaybackRate(player, rate);
        return; // Success, exit retry loop
      } catch (error) {
        console.warn(`Rate application failed, attempt ${retryCount + 1}/${maxRetries}:`, error);
      }
    }
    
    retryCount++;
    if (retryCount < maxRetries) {
      console.log(`Retrying rate application in ${delay}ms...`);
      setTimeout(attemptApply, delay);
    } else {
      console.error(`Failed to apply rate after ${maxRetries} attempts`);
    }
  };
  
  attemptApply();
}

/**
 * Safely seek to a specific time in a YouTube player
 * @param player - YouTube player instance
 * @param seconds - Time to seek to in seconds
 * @param allowSeekAhead - Whether to allow seeking ahead of loaded content
 */
export function seekSafe(player: unknown, seconds: number, allowSeekAhead: boolean = true): void {
  if (!player) {
    console.warn('Player not ready or seekTo not available');
    return;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.seekTo !== 'function') {
    console.warn('Player seekTo method not available');
    return;
  }

  try {
    typedPlayer.seekTo(seconds, allowSeekAhead);
  } catch (error) {
    console.error('Failed to seek to time:', error);
  }
}

/**
 * Get the loaded fraction of a YouTube player
 * @param player - YouTube player instance
 * @returns Loaded fraction (0-1) or 0 if not available
 */
export function getLoadedFraction(player: unknown): number {
  if (!player) {
    return 0;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.getVideoLoadedFraction !== 'function') {
    return 0;
  }

  try {
    return typedPlayer.getVideoLoadedFraction();
  } catch (error) {
    console.error('Failed to get loaded fraction:', error);
    return 0;
  }
}

/**
 * Get current time from a YouTube player
 * @param player - YouTube player instance
 * @returns Current time in seconds or 0 if not available
 */
export function getCurrentTime(player: unknown): number {
  if (!player) {
    return 0;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.getCurrentTime !== 'function') {
    return 0;
  }

  try {
    return typedPlayer.getCurrentTime();
  } catch (error) {
    console.error('Failed to get current time:', error);
    return 0;
  }
}

/**
 * Get video duration from a YouTube player
 * @param player - YouTube player instance
 * @returns Duration in seconds or 0 if not available
 */
export function getDuration(player: unknown): number {
  if (!player) {
    return 0;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.getDuration !== 'function') {
    return 0;
  }

  try {
    return typedPlayer.getDuration();
  } catch (error) {
    console.error('Failed to get duration:', error);
    return 0;
  }
}

/**
 * Play a YouTube player
 * @param player - YouTube player instance
 */
export function playVideo(player: unknown): void {
  if (!player) {
    console.warn('Player not ready or playVideo not available');
    return;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.playVideo !== 'function') {
    console.warn('Player playVideo method not available');
    return;
  }

  try {
    typedPlayer.playVideo();
  } catch (error) {
    console.error('Failed to play video:', error);
  }
}

/**
 * Pause a YouTube player
 * @param player - YouTube player instance
 */
export function pauseVideo(player: unknown): void {
  if (!player) {
    console.warn('Player not ready or pauseVideo not available');
    return;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.pauseVideo !== 'function') {
    console.warn('Player pauseVideo method not available');
    return;
  }

  try {
    typedPlayer.pauseVideo();
  } catch (error) {
    console.error('Failed to pause video:', error);
  }
}

/**
 * Set volume on a YouTube player
 * @param player - YouTube player instance
 * @param volumeZeroToOne - Volume from 0 to 1 (will be converted to 0–100 for YouTube)
 */
export function setVolumeToPlayer(player: unknown, volumeZeroToOne: number): void {
  if (!player) return;
  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.setVolume !== 'function') return;
  const pct = Math.round(Math.max(0, Math.min(1, volumeZeroToOne)) * 100);
  try {
    typedPlayer.setVolume(pct);
  } catch (error) {
    console.warn('Failed to set volume:', error);
  }
}

/**
 * Get player state
 * @param player - YouTube player instance
 * @returns Player state or -1 if not available
 */
export function getPlayerState(player: unknown): number {
  if (!player) {
    return -1;
  }

  const typedPlayer = player as YouTubePlayer;
  if (typeof typedPlayer.getPlayerState !== 'function') {
    return -1;
  }

  try {
    return typedPlayer.getPlayerState();
  } catch (error) {
    console.error('Failed to get player state:', error);
    return -1;
  }
}
