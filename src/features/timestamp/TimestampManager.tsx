'use client';

import { useProjectStore } from '@/store/project';
import { getCurrentTime, getDuration, getLoadedFraction } from '@/lib/youtube/api';

/**
 * Timestamp Manager component
 * Provides utilities for managing timestamps across tracks
 */
export default function TimestampManager() {
  const { tracks } = useProjectStore();

  const getTrackInfo = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track?.playerRef) return null;

    return {
      currentTime: getCurrentTime(track.playerRef),
      duration: getDuration(track.playerRef),
      loadedFraction: getLoadedFraction(track.playerRef),
    };
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (tracks.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        No tracks loaded
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gray-800 rounded">
      <h3 className="text-lg font-semibold text-white">Track Info</h3>
      {tracks.map((track) => {
        const info = getTrackInfo(track.id);
        if (!info) return null;

        return (
          <div key={track.id} className="p-3 bg-gray-700 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white">
                {track.label || `Track ${track.id}`}
              </span>
              <span className="text-xs text-gray-400">
                {Math.round(info.loadedFraction * 100)}% loaded
              </span>
            </div>
            
            <div className="space-y-1 text-xs text-gray-300">
              <div className="flex justify-between">
                <span>Current:</span>
                <span>{formatTime(info.currentTime)}</span>
              </div>
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{formatTime(info.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span>Rate:</span>
                <span>{track.rate || 1}x</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
