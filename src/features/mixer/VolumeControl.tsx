'use client';

import { useCallback, useEffect } from 'react';
import { useProjectStore } from '@/store/project';
import { setVolumeToPlayer, isPlayerReady } from '@/lib/youtube/api';

interface VolumeControlProps {
  trackId: string;
}

/**
 * Per-track volume control. Store uses 0–1; YouTube API uses 0–100.
 */
export default function VolumeControl({ trackId }: VolumeControlProps) {
  const { tracks, setTrackVolume } = useProjectStore();
  const track = tracks.find((t) => t.id === trackId);
  const volume = Math.round((track?.volume ?? 1) * 100) / 100;

  const applyVolumeToPlayer = useCallback((playerRef: unknown, vol: number) => {
    if (!playerRef || !isPlayerReady(playerRef)) return;
    setVolumeToPlayer(playerRef, vol);
  }, []);

  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, Math.round(newVolume * 100) / 100));
      setTrackVolume(trackId, clamped);

      const state = useProjectStore.getState();
      const t = state.tracks.find((x) => x.id === trackId);
      if (t?.playerRef && isPlayerReady(t.playerRef)) {
        applyVolumeToPlayer(t.playerRef, clamped);
      }
    },
    [trackId, setTrackVolume, applyVolumeToPlayer]
  );

  useEffect(() => {
    const state = useProjectStore.getState();
    const t = state.tracks.find((x) => x.id === trackId);
    if (!t?.playerRef || !isPlayerReady(t.playerRef)) return;
    const vol = t.volume ?? 1;
    applyVolumeToPlayer(t.playerRef, vol);
  }, [track?.volume, track?.playerRef, track?.ready, trackId, applyVolumeToPlayer]);

  if (!track) return null;

  const label = trackId === 'video1' ? 'V1' : 'V2';
  return (
    <div
      className="w-full bg-gray-800 rounded-lg py-3 px-4 border border-gray-600"
      title={`${label} volume`}
    >
      <div className="flex items-center gap-4 w-full">
        <h4 className="text-sm font-semibold text-white shrink-0 min-w-[3rem]">
          {label} Vol
        </h4>
        <div className="flex-1 min-w-0">
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="w-full h-4 bg-gray-700 rounded-lg cursor-pointer pitch-slider accent-blue-500"
          />
        </div>
        <span className="text-sm font-mono text-green-400 bg-green-900/80 px-3 py-1.5 rounded min-w-[4rem] text-center shrink-0">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
