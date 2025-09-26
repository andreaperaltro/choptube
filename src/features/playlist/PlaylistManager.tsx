'use client';

import { useProjectStore } from '@/store/project';
import { useState } from 'react';

/**
 * Playlist Manager component
 * Provides playlist management functionality
 */
export default function PlaylistManager() {
  const { tracks, addTrack, removeTrack, updateTrack } = useProjectStore();
  const [newTrackLabel, setNewTrackLabel] = useState('');

  const handleAddTrack = () => {
    if (newTrackLabel.trim()) {
      const newTrack = {
        id: `track_${Date.now()}`,
        type: 'youtube' as const,
        label: newTrackLabel.trim(),
        volume: 1,
        rate: 1,
        ready: false,
      };
      addTrack(newTrack);
      setNewTrackLabel('');
    }
  };

  const handleRemoveTrack = (trackId: string) => {
    removeTrack(trackId);
  };

  const handleUpdateLabel = (trackId: string, label: string) => {
    updateTrack(trackId, { label });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-800 rounded">
      <h3 className="text-lg font-semibold text-white">Playlist</h3>
      
      {/* Add new track */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTrackLabel}
          onChange={(e) => setNewTrackLabel(e.target.value)}
          placeholder="Track name..."
          className="flex-1 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
          onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
        />
        <button
          onClick={handleAddTrack}
          disabled={!newTrackLabel.trim()}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Track list */}
      <div className="space-y-2">
        {tracks.map((track) => (
          <div key={track.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
            <div className="flex-1">
              <input
                type="text"
                value={track.label || ''}
                onChange={(e) => handleUpdateLabel(track.id, e.target.value)}
                className="w-full px-2 py-1 text-sm bg-transparent border border-gray-600 rounded text-white"
              />
              <div className="text-xs text-gray-400 mt-1">
                {track.ready ? 'Ready' : 'Not ready'} • 
                Volume: {Math.round((track.volume || 1) * 100)}% • 
                Rate: {track.rate || 1}x
              </div>
            </div>
            <button
              onClick={() => handleRemoveTrack(track.id)}
              className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {tracks.length === 0 && (
        <div className="text-center text-gray-400 py-4">
          No tracks in playlist
        </div>
      )}
    </div>
  );
}
