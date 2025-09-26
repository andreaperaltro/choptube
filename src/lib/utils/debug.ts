/**
 * Debug utilities for ChopTube
 * These functions help with debugging and clearing stored data
 */

/**
 * Clear all ChopTube data from localStorage
 */
export function clearAllChopTubeData(): void {
  if (typeof window === 'undefined') return;
  
  const keys = [
    'choptube-playlist',
    'choptube-project',
    'choptube.dev'
  ];
  
  keys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('🧹 Cleared all ChopTube data from localStorage');
}

/**
 * Get all ChopTube data from localStorage
 */
export function getAllChopTubeData(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  
  const keys = [
    'choptube-playlist',
    'choptube-project',
    'choptube.dev'
  ];
  
  const data: Record<string, unknown> = {};
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });
  
  return data;
}

/**
 * Debug playlist data
 */
export function debugPlaylistData(): void {
  const data = getAllChopTubeData();
  console.log('📊 ChopTube localStorage data:', data);
  
  if (data['choptube-playlist']) {
    const playlist = data['choptube-playlist'] as { videos?: unknown[] };
    console.log('🎵 Playlist videos:', playlist.videos?.length || 0);
    if (playlist.videos?.length && playlist.videos.length > 0) {
      console.log('📹 Video details:', playlist.videos);
    }
  }
}

/**
 * Clear only playlist data
 */
export function clearPlaylistData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('choptube-playlist');
  console.log('🧹 Cleared playlist data from localStorage');
  
  // Reload the page to reflect changes
  window.location.reload();
}
