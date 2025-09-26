'use client';

import { useState, useEffect } from 'react';
import { preloadManager } from '@/lib/youtube/preload';
import { useProjectStore } from '@/store/project';

interface TrackStatusProps {
  trackId: string;
  onRetry?: () => void;
}

/**
 * Track Status Component
 * Shows readiness status for individual tracks with retry functionality
 */
export default function TrackStatus({ trackId, onRetry }: TrackStatusProps) {
  const { tracks, setTrackReady } = useProjectStore();
  const [loadedFraction, setLoadedFraction] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const track = tracks.find(t => t.id === trackId);
  const isReady = track?.ready === true;
  const hasPlayer = !!track?.playerRef;

  // Update loaded fraction periodically
  useEffect(() => {
    if (!hasPlayer || isReady) return;

    const updateLoadedFraction = () => {
      if (track?.playerRef) {
        const fraction = preloadManager.getLoadedFraction(track.playerRef);
        setLoadedFraction(fraction);
      }
    };

    updateLoadedFraction();
    const interval = setInterval(updateLoadedFraction, 1000);
    return () => clearInterval(interval);
  }, [hasPlayer, isReady, track?.playerRef]);

  const handleRetry = async () => {
    if (!track?.playerRef || isRetrying) return;

    setIsRetrying(true);
    try {
      // Retry preload for this single track
      const playersByTrackId = new Map([[trackId, track.playerRef]]);
      const firstCueTimes = { [trackId]: 0 }; // Default to start of video
      
      const summary = await preloadManager.armAll(playersByTrackId, firstCueTimes);
      
      if (summary.errors[trackId]) {
        const error = summary.errors[trackId];
        if (error.includes('Autoplay blocked')) {
          // Show helpful hint for autoplay blocking
          console.warn(`Track ${trackId}: ${error}. Try clicking 'Arm audio' first.`);
        }
        throw new Error(error);
      }
      
      setTrackReady(trackId, true);
    } catch (error) {
      console.warn(`Retry failed for track ${trackId}:`, error);
      // Don't show error toast for retry failures to avoid spam
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusInfo = () => {
    if (!hasPlayer) {
      return { status: 'not-armed', label: 'Not armed', color: 'bg-gray-600' };
    }
    
    if (isReady) {
      return { status: 'ready', label: 'Ready', color: 'bg-green-600' };
    }
    
    if (loadedFraction > 0.01) {
      return { status: 'buffering', label: 'Buffering', color: 'bg-yellow-600' };
    }
    
    return { status: 'not-armed', label: 'Not armed', color: 'bg-gray-600' };
  };

  const statusInfo = getStatusInfo();
  const percentage = Math.round(loadedFraction * 100);

  return (
    <div className="flex items-center gap-2">
      {/* Status Chip */}
      <div 
        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${statusInfo.color} text-white`}
        title={
          hasPlayer 
            ? `Buffered ~${percentage}%` 
            : 'No player loaded'
        }
      >
        {isRetrying ? (
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
            Retrying...
          </span>
        ) : (
          statusInfo.label
        )}
      </div>

      {/* Retry Button */}
      {hasPlayer && !isReady && (
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            isRetrying
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500'
          }`}
          title="Retry preload for this track"
        >
          {isRetrying ? '⏳' : '🔄'}
        </button>
      )}
    </div>
  );
}
