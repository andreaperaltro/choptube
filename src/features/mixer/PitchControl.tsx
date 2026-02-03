'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useProjectStore } from '@/store/project';
import { applyPlaybackRate, isPlayerReady } from '@/lib/youtube/api';
import { showToast } from '@/lib/utils/toast';
import { YOUTUBE_CONFIG } from '@/lib/config';

const ALLOWED_RATES = YOUTUBE_CONFIG.ALLOWED_RATES;
const PITCH_STEP = YOUTUBE_CONFIG.PITCH_STEP;
const PITCH_MIN = YOUTUBE_CONFIG.PITCH_MIN;
const PITCH_MAX = YOUTUBE_CONFIG.PITCH_MAX;

/** Display/sanitize rate: only show allowed values, default 1.0 */
function displayRateFromTrack(rate: unknown): number {
  const r = typeof rate === 'number' && Number.isFinite(rate) ? rate : 1.0;
  return ALLOWED_RATES.includes(r) ? r : 1.0;
}

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
  isDevUI?: boolean;
}

/**
 * Per-track pitch/speed control component
 */
export default function PitchControl({ trackId, isDevUI = false }: PitchControlProps) {
  const { tracks, setTrackRate, selectedTrackId, setSelectedTrackId } = useProjectStore();
  
  const track = tracks.find(t => t.id === trackId);
  const displayRate = Math.round(displayRateFromTrack(track?.rate) * 100) / 100;

  const applyRateToPlayer = useCallback((playerRef: unknown, rate: number) => {
    if (!playerRef || !isPlayerReady(playerRef)) return false;
    const quantizedRate = quantizeToAllowedRate(rate);
    return applyPlaybackRate(playerRef, quantizedRate, () => {
      setTrackRate(trackId, 1.0);
      showToast('Rate not supported on this video', { type: 'warning', duration: 2500 });
      setTimeout(() => {
        const state = useProjectStore.getState();
        const t = state.tracks.find((x) => x.id === trackId);
        if (t?.playerRef && isPlayerReady(t.playerRef)) {
          applyPlaybackRate(t.playerRef, 1.0);
        }
      }, 100);
    });
  }, [trackId, setTrackRate]);

  const handleRateChange = useCallback((newRate: number) => {
    const clamped = Math.round(Math.max(PITCH_MIN, Math.min(PITCH_MAX, newRate)) * 100) / 100;
    setTrackRate(trackId, clamped);

    // Apply to player immediately – get latest track from store (Zustand updates synchronously)
    const state = useProjectStore.getState();
    const t = state.tracks.find((x) => x.id === trackId);
    if (t?.playerRef && isPlayerReady(t.playerRef)) {
      applyRateToPlayer(t.playerRef, quantizeToAllowedRate(clamped));
    }
  }, [trackId, setTrackRate, applyRateToPlayer]);

  // Also apply when track.rate or player becomes available (backup path; always read from getState)
  useEffect(() => {
    const state = useProjectStore.getState();
    const t = state.tracks.find((x) => x.id === trackId);
    if (!t?.playerRef || !isPlayerReady(t.playerRef)) return;
    const rate = displayRateFromTrack(t.rate);
    if (t.rate !== rate) setTrackRate(trackId, rate); // fix store if invalid (e.g. persisted 0.35)
    applyRateToPlayer(t.playerRef, quantizeToAllowedRate(rate));
  }, [track?.rate, track?.playerRef, track?.ready, trackId, applyRateToPlayer, setTrackRate]);

  const handleReset = useCallback(() => {
    handleRateChange(1.0);
  }, [handleRateChange]);

  const handleStepDown = useCallback(() => {
    handleRateChange(displayRate - PITCH_STEP);
  }, [displayRate, handleRateChange]);

  const handleStepUp = useCallback(() => {
    handleRateChange(displayRate + PITCH_STEP);
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

  // Full-width pitch bar (production): one per column, 0.05 step, apply immediately
  if (!isDevUI) {
    return (
      <div
        className="w-full bg-gray-800 rounded-lg py-3 px-4 border border-gray-600"
        title={`${trackId === 'video1' ? 'Video 1' : 'Video 2'} pitch – slider or −/+ (0.05 step)`}
      >
        <div className="flex items-center gap-4 w-full">
          <h4 className="text-sm font-semibold text-white shrink-0 min-w-[3rem]">
            {trackId === 'video1' ? 'V1' : 'V2'} Pitch
          </h4>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepDown();
            }}
            disabled={displayRate <= PITCH_MIN}
            className="shrink-0 w-10 h-10 rounded-lg bg-gray-600 text-white text-lg font-bold hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-600 flex items-center justify-center"
            aria-label="Decrease rate"
          >
            −
          </button>
          <div className="flex-1 min-w-0">
            <input
              type="range"
              min={PITCH_MIN}
              max={PITCH_MAX}
              step={PITCH_STEP}
              value={displayRate}
              onChange={(e) => {
                e.stopPropagation();
                handleRateChange(Number(e.target.value));
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-4 bg-gray-700 rounded-lg cursor-pointer pitch-slider accent-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepUp();
            }}
            disabled={displayRate >= PITCH_MAX}
            className="shrink-0 w-10 h-10 rounded-lg bg-gray-600 text-white text-lg font-bold hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-600 flex items-center justify-center"
            aria-label="Increase rate"
          >
            +
          </button>
          <span className="text-sm font-mono text-green-400 bg-green-900/80 px-3 py-1.5 rounded min-w-[4rem] text-center shrink-0">
            {displayRate.toFixed(2)}×
          </span>
        </div>
      </div>
    );
  }

  // Dev mode: full control with 0.05 step slider + preset buttons + reset
  return (
    <div
      className={`w-full bg-gray-800 rounded-lg py-3 px-4 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-2 border-blue-500 shadow-lg shadow-blue-500/25'
          : 'border border-gray-600 hover:border-gray-500'
      }`}
      onClick={handleContainerClick}
      title={isSelected ? 'Selected (Alt+← →)' : 'Click to select for keyboard shortcuts'}
    >
      <div className="flex items-center justify-between gap-4 mb-2">
        <h4 className="text-sm font-semibold text-white">Pitch/Speed</h4>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepDown();
            }}
            disabled={displayRate <= PITCH_MIN}
            className="w-10 h-10 rounded-lg bg-gray-600 text-white text-lg font-bold hover:bg-gray-500 disabled:opacity-50 flex items-center justify-center"
          >
            −
          </button>
          <span className="text-sm font-mono text-green-400 bg-green-900 px-3 py-1.5 rounded min-w-[4rem] text-center">
            {displayRate.toFixed(2)}×
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStepUp();
            }}
            disabled={displayRate >= PITCH_MAX}
            className="w-10 h-10 rounded-lg bg-gray-600 text-white text-lg font-bold hover:bg-gray-500 disabled:opacity-50 flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>
      <div className="mb-2">
        <input
          type="range"
          min={PITCH_MIN}
          max={PITCH_MAX}
          step={PITCH_STEP}
          value={displayRate}
          onChange={(e) => {
            e.stopPropagation();
            handleRateChange(Number(e.target.value));
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full h-4 bg-gray-700 rounded-lg cursor-pointer pitch-slider"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{PITCH_MIN}×</span>
          <span>{PITCH_MAX}×</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mb-2">
        {ALLOWED_RATES.map((rate) => (
          <button
            key={rate}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRateChange(rate);
            }}
            className={`px-2 py-1 text-xs rounded ${
              Math.abs(displayRate - rate) < 0.03 ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {rate}×
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleReset();
        }}
        className={`w-full px-3 py-2 text-sm rounded ${
          Math.abs(displayRate - 1.0) < 0.01
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-purple-600 text-white hover:bg-purple-500'
        }`}
        disabled={Math.abs(displayRate - 1.0) < 0.01}
      >
        Reset to 1.0×
      </button>
    </div>
  );
}
