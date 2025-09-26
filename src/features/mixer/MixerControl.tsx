'use client';

import { useProjectStore } from '@/store/project';
// import { applyPlaybackRate } from '@/lib/youtube/api'; // Currently disabled

/**
 * Mixer Control component
 * Provides volume and playback rate controls for tracks
 */
export default function MixerControl() {
  const { tracks, setTrackVolume, setTrackRate } = useProjectStore();

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTrackVolume(trackId, volume);
  };

  const handleRateChange = (trackId: string, rate: number) => {
    setTrackRate(trackId, rate);
    
    // DISABLED: Apply rate to player immediately to prevent null reference errors
    console.log('MixerControl rate application DISABLED to prevent errors');
    // const track = tracks.find(t => t.id === trackId);
    // if (track?.playerRef) {
    //   applyPlaybackRate(track.playerRef, rate);
    // }
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
      <h3 className="text-lg font-semibold text-white">Mixer</h3>
      {tracks.map((track) => (
        <div key={track.id} className="space-y-2 p-3 bg-gray-700 rounded">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white">
              {track.label || `Track ${track.id}`}
            </span>
            <span className="text-xs text-gray-400">
              {track.ready ? 'Ready' : 'Loading...'}
            </span>
          </div>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Volume: {Math.round((track.volume || 1) * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={track.volume || 1}
                onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Rate: {track.rate || 1}x
              </label>
              <input
                type="range"
                min="0.25"
                max="2"
                step="0.25"
                value={track.rate || 1}
                onChange={(e) => handleRateChange(track.id, Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
