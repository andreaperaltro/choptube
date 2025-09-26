/**
 * YouTube URL parsing utilities
 * Handles various YouTube URL formats and extracts video IDs
 */

/**
 * Parse YouTube video ID from various URL formats
 * @param url - YouTube URL (youtube.com/watch?v=, youtu.be/, etc.)
 * @returns Video ID string or null if not found
 * 
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function parseYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Clean up the URL
  const cleanUrl = url.trim();
  
  try {
    // Handle direct video ID (11 characters, alphanumeric + underscore + hyphen)
    if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
      return cleanUrl;
    }

    // Parse as URL
    const urlObj = new URL(cleanUrl);
    
    // Handle youtu.be format
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1); // Remove leading slash
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    }
    
    // Handle youtube.com formats
    if (urlObj.hostname === 'www.youtube.com' || 
        urlObj.hostname === 'youtube.com' || 
        urlObj.hostname === 'm.youtube.com') {
      
      // Handle /watch?v= format
      if (urlObj.pathname === '/watch') {
        const videoId = urlObj.searchParams.get('v');
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }
      
      // Handle /embed/ format
      if (urlObj.pathname.startsWith('/embed/')) {
        const videoId = urlObj.pathname.split('/embed/')[1];
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }
      
      // Handle /v/ format (legacy)
      if (urlObj.pathname.startsWith('/v/')) {
        const videoId = urlObj.pathname.split('/v/')[1];
        if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
          return videoId;
        }
      }
    }
    
    return null;
  } catch {
    // If URL parsing fails, try regex patterns as fallback
    
    // Match youtu.be links
    const youtuBeMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (youtuBeMatch) {
      return youtuBeMatch[1];
    }
    
    // Match youtube.com watch links
    const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return watchMatch[1];
    }
    
    // Match embed links
    const embedMatch = cleanUrl.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      return embedMatch[1];
    }
    
    return null;
  }
}

/**
 * Generate a standard YouTube watch URL from a video ID
 * @param videoId - YouTube video ID
 * @returns Standard YouTube watch URL
 */
export function generateYouTubeUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Validate if a string is a valid YouTube video ID
 * @param videoId - Potential video ID
 * @returns True if valid video ID format
 */
export function isValidYouTubeId(videoId: string): boolean {
  return typeof videoId === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Extract video title from YouTube URL (if available in URL params)
 * Note: This only works for URLs that include title in search params
 * @param url - YouTube URL
 * @returns Title string or null
 */
export function extractTitleFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Some YouTube URLs include title in search params
    const title = urlObj.searchParams.get('title') || 
                  urlObj.searchParams.get('t') ||
                  null;
    
    return title ? decodeURIComponent(title) : null;
  } catch {
    return null;
  }
}
