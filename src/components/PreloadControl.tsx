'use client';

import { useState, useCallback } from 'react';
import { useProjectStore } from '@/store/project';
import { preloadManager, PreloadSummary } from '@/lib/youtube/preload';
import { showSuccess, showError, showWarning } from '@/lib/utils/toast';

/**
 * Preload Control Component
 * Provides UI for arming all YouTube players for optimal playback readiness
 */
export default function PreloadControl() {
  const { tracks, setTrackReady, setAllReady } = useProjectStore();
  const [isPreloading, setIsPreloading] = useState(false);

  const handlePreloadAll = useCallback(async () => {
    if (isPreloading) return;

    // Filter tracks that have players
    const tracksWithPlayers = tracks.filter(track => track.playerRef);
    
    if (tracksWithPlayers.length === 0) {
      showWarning('No videos loaded. Please load videos first.');
      return;
    }

    setIsPreloading(true);
    
    try {
      // Create map of track IDs to players
      const playersByTrackId = new Map(
        tracksWithPlayers.map(track => [track.id, track.playerRef!])
      );

      // For now, use 0 as first cue time for all tracks
      // In the future, this could be enhanced to use actual pad timestamps
      const firstCueTimes: Record<string, number | undefined> = {};
      tracksWithPlayers.forEach(track => {
        firstCueTimes[track.id] = 0; // Default to start of video
      });

      showSuccess(`Preloading ${tracksWithPlayers.length} videos...`);

      // Reset all tracks to not ready
      setAllReady(false);

      // Run preload pipeline
      const summary: PreloadSummary = await preloadManager.armAll(
        playersByTrackId,
        firstCueTimes
      );

      // Update track ready states based on results
      tracksWithPlayers.forEach(track => {
        const isReady = summary.errors[track.id] === undefined;
        setTrackReady(track.id, isReady);
      });

      // Show results with iOS-specific messaging
      if (summary.readyCount === summary.total) {
        showSuccess(`All ${summary.readyCount} videos ready for playback!`);
      } else {
        const pendingCount = summary.total - summary.readyCount;
        const errorCount = Object.keys(summary.errors).length;
        
        if (summary.needsGesture) {
          showWarning(`User gesture required for autoplay. Click "Arm audio" again after interacting with the page.`);
        } else if (errorCount > 0) {
          showWarning(`${summary.readyCount} ready, ${pendingCount} failed. Use retry buttons on individual tracks.`);
        } else {
          showWarning(`${summary.readyCount} ready, ${pendingCount} pending. Check console for details.`);
        }
        
        // Log errors for debugging
        Object.entries(summary.errors).forEach(([trackId, error]) => {
          console.warn(`Preload failed for track ${trackId}:`, error);
        });
      }

      // Log summary for debugging
      console.log('Preload Summary:', {
        total: summary.total,
        ready: summary.readyCount,
        errors: Object.keys(summary.errors).length
      });

    } catch (error) {
      console.error('Preload failed:', error);
      showError(`Preload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPreloading(false);
    }
  }, [isPreloading, tracks, setTrackReady, setAllReady]);

  const readyCount = tracks.filter(track => track.ready).length;
  const totalTracks = tracks.length;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Preload Control</h3>
        <div className="text-xs text-gray-400">
          {readyCount}/{totalTracks} ready
        </div>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={handlePreloadAll}
          disabled={isPreloading || totalTracks === 0}
          className={`w-full px-4 py-2 text-sm font-medium rounded transition-all duration-200 ${
            isPreloading
              ? 'bg-yellow-600 text-white cursor-not-allowed'
              : totalTracks === 0
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-500'
          }`}
        >
          {isPreloading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Preloading...
            </span>
          ) : (
            '🎵 Arm Audio / Preload All'
          )}
        </button>

        {totalTracks > 0 && (
          <div className="text-xs text-gray-400">
            <p>• Mutes all videos and preloads content</p>
            <p>• Reduces playback lag significantly</p>
            <p>• Run after loading videos, before playing</p>
            <p>• iOS Safari: May require user gesture for autoplay</p>
          </div>
        )}

        {totalTracks === 0 && (
          <div className="text-xs text-gray-500">
            Load videos first to enable preloading
          </div>
        )}
      </div>
    </div>
  );
}
