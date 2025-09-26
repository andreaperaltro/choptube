'use client';

import { useCallback } from 'react';
import { usePlaylistStore } from '@/store/playlist';
import { useHydration } from '@/lib/hooks/useHydration';

interface PlaylistDropdownProps {
  value: string | null;
  onChange: (videoId: string | null) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Dropdown component for selecting videos from the playlist
 */
export default function PlaylistDropdown({ 
  value, 
  onChange, 
  placeholder = "Choose from Playlist",
  className = ""
}: PlaylistDropdownProps) {
  const { getAllVideos } = usePlaylistStore();
  const isHydrated = useHydration();
  
  const videos = isHydrated ? getAllVideos() : [];

  const handleChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;
    onChange(selectedValue === '' ? null : selectedValue);
  }, [onChange]);

  const selectedVideo = value ? videos.find(v => v.id === value) : null;
  const isSelectedVideoMissing = value && !selectedVideo;

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={handleChange}
        className={`w-full p-2 bg-gray-700 border rounded text-white text-sm ${
          isSelectedVideoMissing 
            ? 'border-red-500 bg-red-900/20' 
            : 'border-gray-600'
        } ${className}`}
        disabled={videos.length === 0}
      >
        <option value="">{placeholder}</option>
        {videos.map((video) => (
          <option key={video.id} value={video.id}>
            {video.title || `Video ${video.id}`} ({video.pads.length} pads)
          </option>
        ))}
      </select>
      
      {/* Warning for missing video */}
      {isSelectedVideoMissing && (
        <div className="absolute -bottom-5 left-0 text-xs text-red-400">
          ⚠ Video removed from playlist
        </div>
      )}
      
      {/* Empty state */}
      {videos.length === 0 && (
        <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
          No videos in playlist
        </div>
      )}
    </div>
  );
}
