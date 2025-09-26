'use client';

import { useCallback, useEffect } from 'react';
import { useProjectStore } from '@/store/project';
import { applyPlaybackRate, isPlayerReady } from '@/lib/youtube/api';
import { showToast } from '@/lib/utils/toast';

/**
 * YouTube allowed playback rates
 */
const ALLOWED_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Quantize a raw rate to the nearest allowed YouTube rate
 */
function quantizeToAllowedRate(rawRate: number): number {
  return ALLOWED_RATES.reduce((closest, rate) => 
    Math.abs(rate - rawRate) < Math.abs(closest - rawRate) ? rate : closest
  );
}

interface PitchControlProps {
  trackId: string;
}

/**
 * Per-track pitch/speed control component
 */
export default function PitchControl({ trackId }: PitchControlProps) {
  const { tracks, setTrackRate, selectedTrackId, setSelectedTrackId } = useProjectStore();
  
  const track = tracks.find(t => t.id === trackId);
  const currentRate = track?.rate || 1.0;
  
  // Ensure we always display the quantized rate
  const displayRate = quantizeToAllowedRate(currentRate);

  const handleRateChange = useCallback((newRate: number) => {
    // Quantize to nearest allowed rate
    const quantizedRate = quantizeToAllowedRate(newRate);
    
    // Update store
    setTrackRate(trackId, quantizedRate);
    
    // Apply to player if ready
    if (track?.playerRef && track.ready && isPlayerReady(track.playerRef)) {
      console.log(`🎵 Setting track ${trackId} rate to ${quantizedRate}x`);
      
      const success = applyPlaybackRate(track.playerRef, quantizedRate, () => {
        // On error, revert to 1.0x and show toast
        console.warn(`Rate ${quantizedRate}x failed for ${trackId}, reverting to 1.0x`);
        setTrackRate(trackId, 1.0);
        showToast('Rate not supported on this video', { type: 'warning', duration: 2500 });
        
        // Try to apply 1.0x as fallback
        setTimeout(() => {
          if (track?.playerRef && isPlayerReady(track.playerRef)) {
            applyPlaybackRate(track.playerRef, 1.0);
          }
        }, 100);
      });
      
      if (!success) {
        // Immediate failure, revert to 1.0x
        setTrackRate(trackId, 1.0);
        showToast('Rate not supported on this video', { type: 'warning', duration: 2500 });
      }
    }
  }, [trackId, track, setTrackRate]);

  const handleReset = useCallback(() => {
    handleRateChange(1.0);
  }, [handleRateChange]);

  const handleStepDown = useCallback(() => {
    const currentIndex = ALLOWED_RATES.findIndex(rate => Math.abs(rate - displayRate) < 0.01);
    const nextIndex = Math.max(0, currentIndex - 1);
    handleRateChange(ALLOWED_RATES[nextIndex]);
  }, [displayRate, handleRateChange]);

  const handleStepUp = useCallback(() => {
    const currentIndex = ALLOWED_RATES.findIndex(rate => Math.abs(rate - displayRate) < 0.01);
    const nextIndex = Math.min(ALLOWED_RATES.length - 1, currentIndex + 1);
    handleRateChange(ALLOWED_RATES[nextIndex]);
  }, [displayRate, handleRateChange]);

  const isSelected = selectedTrackId === trackId;

  const handleContainerClick = useCallback(() => {
    setSelectedTrackId(trackId);
  }, [trackId, setSelectedTrackId]);

  // Keyboard shortcuts for selected track
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isSelected && event.altKey) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          handleStepDown();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          handleStepUp();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, handleStepDown, handleStepUp]);

  if (!track) {
    return null;
  }

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-2 cursor-pointer transition-all duration-200 ${
        isSelected 
          ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/25' 
          : 'border border-gray-600 hover:border-gray-500'
      }`}
      onClick={handleContainerClick}
      title={isSelected ? "Selected (Alt+← →)" : "Click to select for keyboard shortcuts"}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-white">Pitch/Speed</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStepDown();
            }}
            disabled={displayRate <= ALLOWED_RATES[0]}
            className={`px-1 py-0.5 text-xs rounded transition-all duration-200 ${
              displayRate <= ALLOWED_RATES[0]
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
            title="Step down to previous rate"
          >
            −
          </button>
          <span className="text-xs text-green-400 font-mono bg-green-900 px-2 py-0.5 rounded">
            {displayRate.toFixed(2)}×
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleStepUp();
            }}
            disabled={displayRate >= ALLOWED_RATES[ALLOWED_RATES.length - 1]}
            className={`px-1 py-0.5 text-xs rounded transition-all duration-200 ${
              displayRate >= ALLOWED_RATES[ALLOWED_RATES.length - 1]
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
            title="Step up to next rate"
          >
            +
          </button>
        </div>
      </div>

      {/* Discrete Rate Buttons */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        {ALLOWED_RATES.map((rate) => (
          <button
            key={rate}
            onClick={(e) => {
              e.stopPropagation();
              handleRateChange(rate);
            }}
            className={`px-1 py-1 text-xs rounded transition-all duration-200 ${
              Math.abs(displayRate - rate) < 0.01
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`Set playback rate to ${rate}x`}
          >
            {rate}×
          </button>
        ))}
      </div>

      {/* Slider for fine control */}
      <div className="mb-2">
        <input
          type="range"
          min={ALLOWED_RATES[0]}
          max={ALLOWED_RATES[ALLOWED_RATES.length - 1]}
          step="0.25"
          value={displayRate}
          onChange={(e) => {
            e.stopPropagation();
            handleRateChange(Number(e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer pitch-slider"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0.25× Slower</span>
          <span>2× Faster</span>
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleReset();
        }}
        className={`w-full px-2 py-1 text-xs rounded transition-all duration-200 ${
          Math.abs(displayRate - 1.0) < 0.01
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-500'
        }`}
        disabled={Math.abs(displayRate - 1.0) < 0.01}
        title="Reset to normal speed (1.0x)"
      >
        Reset to 1.0×
      </button>
    </div>
  );
}
