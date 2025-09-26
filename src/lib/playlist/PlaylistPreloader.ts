/**
 * Playlist Preloader
 * Manages offscreen preloading of playlist candidates for instant switching
 */

import { autoPreloadPlayer } from '../youtube/autoPreload';
// Removed unused policyGuard import

/**
 * Preloaded candidate video
 */
interface PreloadedCandidate {
  videoId: string;
  player: YT.Player; // YouTube player instance
  iframe: HTMLIFrameElement;
  isReady: boolean;
  preloadTime: number;
}

/**
 * Playlist Preloader for instant video switching
 */
class PlaylistPreloader {
  private candidates: Map<string, PreloadedCandidate> = new Map();
  private maxCandidates: number = 3; // Default cap
  private isPreloading: boolean = false;

  /**
   * Set maximum number of candidates to preload
   */
  setMaxCandidates(count: number): void {
    this.maxCandidates = Math.max(0, Math.min(10, count)); // Clamp 0-10
    console.debug(`PlaylistPreloader: Max candidates set to ${this.maxCandidates}`);
  }

  /**
   * Get current max candidates
   */
  getMaxCandidates(): number {
    return this.maxCandidates;
  }

  /**
   * Preload candidates from playlist
   * @param playlistVideos Array of playlist videos
   * @param excludeVideoIds Video IDs to exclude (already mounted)
   */
  async preloadCandidates(
    playlistVideos: Array<{ videoId: string; title?: string }>,
    excludeVideoIds: string[] = []
  ): Promise<{ success: string[]; failed: string[]; skipped: string[] }> {
    if (this.isPreloading) {
      console.debug('PlaylistPreloader: Already preloading, skipping');
      return { success: [], failed: [], skipped: [] };
    }

    this.isPreloading = true;
    console.debug(`PlaylistPreloader: Starting candidate preload (max: ${this.maxCandidates})`);

    const success: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];

    try {
      // Filter out excluded videos and limit to max candidates
      const candidates = playlistVideos
        .filter(video => !excludeVideoIds.includes(video.videoId))
        .slice(0, this.maxCandidates);

      console.debug(`PlaylistPreloader: Preloading ${candidates.length} candidates`);

      // Preload each candidate
      for (const video of candidates) {
        try {
          const candidate = await this.createHiddenPlayer(video.videoId);
          if (candidate) {
            this.candidates.set(video.videoId, candidate);
            success.push(video.videoId);
            console.debug(`PlaylistPreloader: ✅ Preloaded ${video.videoId}`);
          } else {
            failed.push(video.videoId);
            console.debug(`PlaylistPreloader: ❌ Failed to preload ${video.videoId}`);
          }
        } catch (error) {
          failed.push(video.videoId);
          console.debug(`PlaylistPreloader: ❌ Error preloading ${video.videoId}:`, error);
        }
      }

      // Clean up excess candidates if we have more than max
      this.cleanupExcessCandidates();

    } finally {
      this.isPreloading = false;
    }

    console.debug(`PlaylistPreloader: Preload complete - ${success.length} success, ${failed.length} failed, ${skipped.length} skipped`);
    return { success, failed, skipped };
  }

  /**
   * Create hidden YouTube player for a video
   */
  private async createHiddenPlayer(videoId: string): Promise<PreloadedCandidate | null> {
    try {
      // Create hidden iframe container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '320px';
      container.style.height = '180px';
      container.style.visibility = 'hidden';
      document.body.appendChild(container);

      // Create iframe
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&playsinline=1&controls=0&autoplay=0&mute=1`;
      iframe.width = '320';
      iframe.height = '180';
      iframe.style.border = 'none';
      container.appendChild(iframe);

      // Wait for iframe to load
      await new Promise<void>((resolve, reject) => {
        iframe.onload = () => resolve();
        iframe.onerror = () => reject(new Error('Iframe failed to load'));
        setTimeout(() => reject(new Error('Iframe load timeout')), 10000);
      });

      // Wait for YouTube API to be ready
      await new Promise<void>((resolve) => {
        const checkAPI = () => {
          if (window.YT && window.YT.Player) {
            resolve();
          } else {
            setTimeout(checkAPI, 100);
          }
        };
        checkAPI();
      });

      // Create YouTube player
      const player = new window.YT.Player(iframe, {
        events: {
          onReady: () => {
            console.debug(`PlaylistPreloader: Hidden player ready for ${videoId}`);
          },
          onError: (event: { data: number }) => {
            console.debug(`PlaylistPreloader: Hidden player error for ${videoId}:`, event.data);
          }
        }
      });

      // Wait for player to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (player && typeof player.getCurrentTime === 'function') {
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      // Auto-preload the player
      const isReady = await autoPreloadPlayer(player, `candidate-${videoId}`, 0);
      
      return {
        videoId,
        player,
        iframe,
        isReady,
        preloadTime: Date.now()
      };

    } catch (error) {
      console.debug(`PlaylistPreloader: Failed to create hidden player for ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Get preloaded candidate for a video ID
   */
  getCandidate(videoId: string): PreloadedCandidate | null {
    return this.candidates.get(videoId) || null;
  }

  /**
   * Check if a video is preloaded
   */
  isPreloaded(videoId: string): boolean {
    return this.candidates.has(videoId);
  }

  /**
   * Swap preloaded player into visible slot
   * @param videoId Video ID to swap
   * @param targetContainer Target container element
   * @returns Success status
   */
  swapToVisible(videoId: string, targetContainer: HTMLElement): boolean {
    const candidate = this.candidates.get(videoId);
    if (!candidate) {
      console.debug(`PlaylistPreloader: No candidate found for ${videoId}`);
      return false;
    }

    try {
      // Move iframe to target container
      targetContainer.appendChild(candidate.iframe);
      
      // Make iframe visible
      candidate.iframe.style.position = 'static';
      candidate.iframe.style.left = 'auto';
      candidate.iframe.style.top = 'auto';
      candidate.iframe.style.visibility = 'visible';
      candidate.iframe.style.width = '100%';
      candidate.iframe.style.height = '100%';

      console.debug(`PlaylistPreloader: ✅ Swapped ${videoId} to visible slot`);
      return true;

    } catch (error) {
      console.debug(`PlaylistPreloader: ❌ Failed to swap ${videoId}:`, error);
      return false;
    }
  }

  /**
   * Remove candidate from preloaded list
   */
  removeCandidate(videoId: string): void {
    const candidate = this.candidates.get(videoId);
    if (candidate) {
      try {
        // Destroy player
        if (candidate.player && typeof candidate.player.destroy === 'function') {
          candidate.player.destroy();
        }
        
        // Remove iframe
        if (candidate.iframe && candidate.iframe.parentNode) {
          candidate.iframe.parentNode.removeChild(candidate.iframe);
        }
        
        this.candidates.delete(videoId);
        console.debug(`PlaylistPreloader: Removed candidate ${videoId}`);
      } catch (error) {
        console.debug(`PlaylistPreloader: Error removing candidate ${videoId}:`, error);
      }
    }
  }

  /**
   * Clean up excess candidates
   */
  private cleanupExcessCandidates(): void {
    if (this.candidates.size <= this.maxCandidates) {
      return;
    }

    // Remove oldest candidates first
    const candidatesArray = Array.from(this.candidates.entries())
      .sort((a, b) => a[1].preloadTime - b[1].preloadTime);

    const toRemove = candidatesArray.slice(this.maxCandidates);
    toRemove.forEach(([videoId]) => {
      this.removeCandidate(videoId);
    });

    console.debug(`PlaylistPreloader: Cleaned up ${toRemove.length} excess candidates`);
  }

  /**
   * Clear all candidates
   */
  clearAll(): void {
    const videoIds = Array.from(this.candidates.keys());
    videoIds.forEach(videoId => this.removeCandidate(videoId));
    console.debug('PlaylistPreloader: Cleared all candidates');
  }

  /**
   * Get current candidates count
   */
  getCandidatesCount(): number {
    return this.candidates.size;
  }

  /**
   * Get all candidate video IDs
   */
  getCandidateVideoIds(): string[] {
    return Array.from(this.candidates.keys());
  }
}

// Export singleton instance
export const playlistPreloader = new PlaylistPreloader();
