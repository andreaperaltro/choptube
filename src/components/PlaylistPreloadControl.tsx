'use client';

import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/project';
import { usePlaylistStore } from '@/store/playlist';
import { playlistPreloadManager } from '@/lib/playlist/PlaylistPreloadManager';
import { showSuccess, showWarning, showError } from '@/lib/utils/toast';

/**
 * Playlist Preload Control component
 * Manages preloading of playlist candidates for fast swapping
 */
export default function PlaylistPreloadControl() {
  const { 
    preloadPlaylistCandidates, 
    setPreloadPlaylistCandidates,
    maxPlaylistPreloads,
    setMaxPlaylistPreloads 
  } = useProjectStore();
  
  const { videos } = usePlaylistStore();
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<{ loaded: number; total: number; current: string } | null>(null);
  const [stats, setStats] = useState({ total: 0, ready: 0, max: 3 });

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setStats(playlistPreloadManager.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePreload = () => {
    setPreloadPlaylistCandidates(!preloadPlaylistCandidates);
    
    if (!preloadPlaylistCandidates) {
      // Starting preload - clear existing and start fresh
      playlistPreloadManager.clearAll();
      startPreloading();
    } else {
      // Stopping preload - clear all
      playlistPreloadManager.clearAll();
      showWarning('Playlist preloading disabled');
    }
  };

  const startPreloading = async () => {
    if (videos.length === 0) {
      showWarning('No videos in playlist to preload');
      return;
    }

    setIsPreloading(true);
    setPreloadProgress({ loaded: 0, total: 0, current: '' });

    try {
      // Get video IDs from playlist
      const videoIds = videos.map(v => v.id);
      
      const result = await playlistPreloadManager.preloadCandidates(
        videoIds,
        (progress) => {
          setPreloadProgress(progress);
        }
      );

      if (result.success.length > 0) {
        showSuccess(`Preloaded ${result.success.length} playlist videos for fast swapping`);
      }
      
      if (result.failed.length > 0) {
        showWarning(`${result.failed.length} videos failed to preload`);
      }

    } catch (error) {
      console.error('Playlist preload failed:', error);
      showError('Failed to preload playlist videos');
    } finally {
      setIsPreloading(false);
      setPreloadProgress(null);
    }
  };

  const handleClearPreloads = () => {
    playlistPreloadManager.clearAll();
    showSuccess('Cleared all preloaded playlist videos');
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Playlist Preload</h3>
        <div className="text-xs text-gray-400">
          {stats.ready}/{stats.total} ready
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-3 mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={preloadPlaylistCandidates}
            onChange={handleTogglePreload}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-white">Preload playlist candidates</span>
        </label>
      </div>

      {/* Settings */}
      {preloadPlaylistCandidates && (
        <div className="space-y-3">
          {/* Max preloads setting */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-white">Max preloads:</label>
            <input
              type="number"
              min="1"
              max="10"
              value={maxPlaylistPreloads}
              onChange={(e) => setMaxPlaylistPreloads(Number(e.target.value))}
              className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">(1-10)</span>
          </div>

          {/* Progress indicator */}
          {isPreloading && preloadProgress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Preloading: {preloadProgress.current}</span>
                <span>{preloadProgress.loaded}/{preloadProgress.total}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(preloadProgress.loaded / preloadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Manual controls */}
          <div className="flex gap-2">
            <button
              onClick={startPreloading}
              disabled={isPreloading || videos.length === 0}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                isPreloading || videos.length === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {isPreloading ? 'Preloading...' : 'Preload Now'}
            </button>
            
            <button
              onClick={handleClearPreloads}
              disabled={stats.total === 0}
              className={`px-3 py-1 text-xs rounded transition-all duration-200 ${
                stats.total === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-500'
              }`}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-gray-400 mt-3">
        <p>• Preloads up to {maxPlaylistPreloads} playlist videos for instant swapping</p>
        <p>• Hidden off-screen players for fast column switching</p>
        <p>• Reduces loading time when selecting playlist videos</p>
      </div>
    </div>
  );
}
