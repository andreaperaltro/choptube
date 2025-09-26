/**
 * Playlist Preload Manager
 * Manages hidden off-screen players for playlist videos to enable fast swapping
 */

import { preloadManager } from '@/lib/youtube/preload';
import { isPlayerReady } from '@/lib/youtube/api';

/**
 * Hidden player for playlist preloading
 */
interface HiddenPlayer {
  videoId: string;
  player: unknown;
  ready: boolean;
  container: HTMLDivElement;
}

/**
 * Playlist preload manager for fast video swapping
 */
export class PlaylistPreloadManager {
  private hiddenPlayers: Map<string, HiddenPlayer> = new Map();
  private maxPreloads: number = 3;

  constructor() {
    // Create hidden container for off-screen players
    this.createHiddenContainer();
  }

  /**
   * Create hidden container for off-screen players
   */
  private createHiddenContainer(): void {
    if (typeof document === 'undefined') return;

    let container = document.getElementById('playlist-preload-container') as HTMLDivElement;
    if (!container) {
      container = document.createElement('div');
      container.id = 'playlist-preload-container';
      container.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        width: 1px;
        height: 1px;
        opacity: 0;
        pointer-events: none;
        z-index: -1;
      `;
      document.body.appendChild(container);
    }
  }

  /**
   * Set maximum number of playlist preloads
   */
  setMaxPreloads(count: number): void {
    this.maxPreloads = Math.max(0, Math.min(10, count));
    this.cleanupExcessPlayers();
  }

  /**
   * Preload playlist candidates
   * @param videoIds Array of video IDs to preload
   * @param onProgress Callback for progress updates
   */
  async preloadCandidates(
    videoIds: string[],
    onProgress?: (progress: { loaded: number; total: number; current: string }) => void
  ): Promise<{ success: string[]; failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    // Limit to max preloads
    const candidatesToPreload = videoIds.slice(0, this.maxPreloads);
    
    console.log(`🎵 Preloading ${candidatesToPreload.length} playlist candidates`);

    for (let i = 0; i < candidatesToPreload.length; i++) {
      const videoId = candidatesToPreload[i];
      
      try {
        onProgress?.({ loaded: i, total: candidatesToPreload.length, current: videoId });
        
        const hiddenPlayer = await this.createHiddenPlayer(videoId);
        if (hiddenPlayer) {
          this.hiddenPlayers.set(videoId, hiddenPlayer);
          success.push(videoId);
          console.log(`✅ Preloaded playlist video: ${videoId}`);
        } else {
          failed.push(videoId);
        }
      } catch (error) {
        console.warn(`Failed to preload playlist video ${videoId}:`, error);
        failed.push(videoId);
      }
    }

    return { success, failed };
  }

  /**
   * Create a hidden player for a video ID
   */
  private async createHiddenPlayer(videoId: string): Promise<HiddenPlayer | null> {
    if (typeof window === 'undefined' || !window.YT) {
      throw new Error('YouTube API not available');
    }

    return new Promise((resolve, reject) => {
      const container = document.getElementById('playlist-preload-container');
      if (!container) {
        reject(new Error('Hidden container not found'));
        return;
      }

      // Create player container
      const playerContainer = document.createElement('div');
      playerContainer.id = `hidden-player-${videoId}`;
      playerContainer.style.cssText = 'width: 320px; height: 240px;';
      container.appendChild(playerContainer);

      try {
        const player = new window.YT.Player(playerContainer, {
          height: 240,
          width: 320,
          videoId: videoId,
          playerVars: {
            // iOS Safari optimized
            playsinline: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            
            // Hidden player configuration
            autoplay: 0,
            mute: 1, // Muted for preload
            controls: 0,
            disablekb: 0,
            
            // Minimal UI
            modestbranding: 1,
            rel: 0,
            iv_load_policy: 3,
            cc_load_policy: 0,
            fs: 0, // No fullscreen for hidden players
            start: 0,
          },
          events: {
            onReady: (event: YT.PlayerEvent) => {
              console.log(`Hidden player ready for ${videoId}`);
              
              // Preload the player
              this.preloadHiddenPlayer(videoId, event.target)
                .then(() => {
                  resolve({
                    videoId,
                    player: event.target,
                    ready: true,
                    container: playerContainer
                  });
                })
                .catch((error) => {
                  console.warn(`Failed to preload hidden player ${videoId}:`, error);
                  resolve({
                    videoId,
                    player: event.target,
                    ready: false,
                    container: playerContainer
                  });
                });
            },
            onError: (event: YT.OnErrorEvent) => {
              console.error(`Hidden player error for ${videoId}:`, event.data);
              reject(new Error(`Player error: ${event.data}`));
            }
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Preload a hidden player
   */
  private async preloadHiddenPlayer(videoId: string, player: unknown): Promise<void> {
    if (!isPlayerReady(player)) {
      throw new Error('Player not ready');
    }

    // Use the preload manager to arm the hidden player
    const playersByTrackId = new Map([[`playlist-${videoId}`, player]]);
    const firstCueTimes = { [`playlist-${videoId}`]: 0 };

    const summary = await preloadManager.armAll(playersByTrackId, firstCueTimes);
    
    if (summary.errors[`playlist-${videoId}`]) {
      throw new Error(summary.errors[`playlist-${videoId}`]);
    }
  }

  /**
   * Get a preloaded player for a video ID
   */
  getPreloadedPlayer(videoId: string): unknown | null {
    const hiddenPlayer = this.hiddenPlayers.get(videoId);
    return hiddenPlayer?.ready ? hiddenPlayer.player : null;
  }

  /**
   * Check if a video is preloaded and ready
   */
  isPreloaded(videoId: string): boolean {
    const hiddenPlayer = this.hiddenPlayers.get(videoId);
    return hiddenPlayer?.ready === true;
  }

  /**
   * Remove a preloaded player
   */
  removePreloadedPlayer(videoId: string): void {
    const hiddenPlayer = this.hiddenPlayers.get(videoId);
    if (hiddenPlayer) {
      try {
        // Destroy the YouTube player
        if (hiddenPlayer.player && typeof (hiddenPlayer.player as any).destroy === 'function') {
          (hiddenPlayer.player as any).destroy();
        }
      } catch (error) {
        console.warn(`Error destroying hidden player ${videoId}:`, error);
      }

      // Remove the container
      if (hiddenPlayer.container && hiddenPlayer.container.parentNode) {
        hiddenPlayer.container.parentNode.removeChild(hiddenPlayer.container);
      }

      this.hiddenPlayers.delete(videoId);
      console.log(`🗑️ Removed preloaded player for ${videoId}`);
    }
  }

  /**
   * Clean up excess players beyond the limit
   */
  private cleanupExcessPlayers(): void {
    if (this.hiddenPlayers.size <= this.maxPreloads) return;

    const playersToRemove = Array.from(this.hiddenPlayers.keys()).slice(this.maxPreloads);
    playersToRemove.forEach(videoId => this.removePreloadedPlayer(videoId));
  }

  /**
   * Get statistics about preloaded players
   */
  getStats(): { total: number; ready: number; max: number } {
    const total = this.hiddenPlayers.size;
    const ready = Array.from(this.hiddenPlayers.values()).filter(p => p.ready).length;
    return { total, ready, max: this.maxPreloads };
  }

  /**
   * Clear all preloaded players
   */
  clearAll(): void {
    const videoIds = Array.from(this.hiddenPlayers.keys());
    videoIds.forEach(videoId => this.removePreloadedPlayer(videoId));
    console.log('🧹 Cleared all preloaded playlist players');
  }
}

// Export singleton instance
export const playlistPreloadManager = new PlaylistPreloadManager();
