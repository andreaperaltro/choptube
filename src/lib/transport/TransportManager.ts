/**
 * Transport Manager
 * Handles transport start/stop with lookahead seeking for minimal latency
 */

import { isPlayerReady, seekSafe, playVideo, pauseVideo, applyPlaybackRate } from '@/lib/youtube/api';

/**
 * Transport manager for coordinating playback across multiple tracks
 */
export class TransportManager {
  private scheduledPlays: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start transport with lookahead seeking
   * @param tracks Array of tracks with playerRef and ready state
   * @param lookaheadMs Lookahead time in milliseconds
   * @param onWarning Callback for warnings
   */
  async startTransport(
    tracks: Array<{ id: string; playerRef?: unknown; ready?: boolean; rate: number }>,
    lookaheadMs: number,
    onWarning?: (message: string) => void
  ): Promise<void> {
    const readyTracks = tracks.filter(track => track.ready && track.playerRef);
    const notReadyTracks = tracks.filter(track => !track.ready);

    // Warn if not all tracks are ready
    if (notReadyTracks.length > 0) {
      const warning = `Starting transport with ${notReadyTracks.length} tracks not ready. Consider preloading first.`;
      console.warn(warning);
      onWarning?.(warning);
    }

    // Process each ready track
    for (const track of readyTracks) {
      if (!isPlayerReady(track.playerRef)) continue;

      try {
        // 1. Apply playback rate first
        applyPlaybackRate(track.playerRef, track.rate);

        // 2. Seek to lookahead position (start of video minus lookahead)
        const lookaheadSeconds = lookaheadMs / 1000;
        const seekPosition = Math.max(0, 0 - lookaheadSeconds); // Start at beginning minus lookahead
        seekSafe(track.playerRef, seekPosition, true);

        // 3. Pause the player (ready for scheduled play)
        pauseVideo(track.playerRef);

        console.log(`🎵 Transport: Track ${track.id} positioned at ${seekPosition}s, ready for playback`);

      } catch (error) {
        console.error(`Failed to prepare track ${track.id} for transport:`, error);
      }
    }
  }

  /**
   * Stop transport - pause all players
   * @param tracks Array of tracks with playerRef
   */
  async stopTransport(
    tracks: Array<{ id: string; playerRef?: unknown }>
  ): Promise<void> {
    // Clear any scheduled plays
    this.scheduledPlays.forEach(timeout => clearTimeout(timeout));
    this.scheduledPlays.clear();

    // Pause all players
    for (const track of tracks) {
      if (track.playerRef && isPlayerReady(track.playerRef)) {
        try {
          pauseVideo(track.playerRef);
        } catch (error) {
          console.error(`Failed to pause track ${track.id}:`, error);
        }
      }
    }

    console.log('🛑 Transport stopped - all players paused');
  }

  /**
   * Schedule a play event with lookahead
   * @param trackId Track identifier
   * @param playerRef YouTube player instance
   * @param targetTime Target time to play at (in seconds)
   * @param lookaheadMs Lookahead time in milliseconds
   * @param onPlay Callback when play is triggered
   */
  schedulePlay(
    trackId: string,
    playerRef: unknown,
    targetTime: number,
    lookaheadMs: number,
    onPlay?: () => void
  ): void {
    if (!isPlayerReady(playerRef)) return;

    // Clear any existing scheduled play for this track
    const existingTimeout = this.scheduledPlays.get(trackId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate when to start seeking and playing
    const now = Date.now();
    const targetTimestamp = targetTime * 1000; // Convert to milliseconds
    const lookaheadTimestamp = targetTimestamp - lookaheadMs;
    const seekDelay = Math.max(0, lookaheadTimestamp - now);
    const playDelay = Math.max(0, targetTimestamp - now);

    // Schedule the seek operation
    if (seekDelay > 0) {
      setTimeout(() => {
        try {
          const seekTime = Math.max(0, targetTime - (lookaheadMs / 1000));
          seekSafe(playerRef, seekTime, true);
          console.log(`🎯 Lookahead seek: Track ${trackId} to ${seekTime}s`);
        } catch (error) {
          console.error(`Lookahead seek failed for track ${trackId}:`, error);
        }
      }, seekDelay);
    }

    // Schedule the play operation
    if (playDelay > 0) {
      const timeout = setTimeout(() => {
        try {
          playVideo(playerRef);
          console.log(`▶️ Scheduled play: Track ${trackId} at ${targetTime}s`);
          onPlay?.();
        } catch (error) {
          console.error(`Scheduled play failed for track ${trackId}:`, error);
        }
        this.scheduledPlays.delete(trackId);
      }, playDelay);

      this.scheduledPlays.set(trackId, timeout);
    } else {
      // Play immediately if we're past the target time
      try {
        playVideo(playerRef);
        onPlay?.();
      } catch (error) {
        console.error(`Immediate play failed for track ${trackId}:`, error);
      }
    }
  }

  /**
   * Cancel scheduled play for a specific track
   * @param trackId Track identifier
   */
  cancelScheduledPlay(trackId: string): void {
    const timeout = this.scheduledPlays.get(trackId);
    if (timeout) {
      clearTimeout(timeout);
      this.scheduledPlays.delete(trackId);
      console.log(`❌ Cancelled scheduled play for track ${trackId}`);
    }
  }

  /**
   * Cancel all scheduled plays
   */
  cancelAllScheduledPlays(): void {
    this.scheduledPlays.forEach((timeout, trackId) => {
      clearTimeout(timeout);
      console.log(`❌ Cancelled scheduled play for track ${trackId}`);
    });
    this.scheduledPlays.clear();
  }

  /**
   * Get the number of scheduled plays
   */
  getScheduledPlayCount(): number {
    return this.scheduledPlays.size;
  }
}

// Export singleton instance
export const transportManager = new TransportManager();
