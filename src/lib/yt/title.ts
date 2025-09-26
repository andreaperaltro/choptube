/**
 * YouTube video title fetching utilities
 * Uses oEmbed API to get video metadata
 */

interface YouTubeOEmbedResponse {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  height: number;
  width: number;
  version: string;
  provider_name: string;
  provider_url: string;
  thumbnail_height: number;
  thumbnail_width: number;
  thumbnail_url: string;
  html: string;
}

/**
 * Fetch YouTube video title using oEmbed API
 * @param videoId - YouTube video ID
 * @returns Promise resolving to video title or null if failed
 */
export async function fetchYouTubeTitle(videoId: string): Promise<string | null> {
  if (!videoId || videoId.length !== 11) {
    return null;
  }

  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`Failed to fetch title for video ${videoId}: ${response.status}`);
      return null;
    }
    
    const data: YouTubeOEmbedResponse = await response.json();
    return data.title || null;
    
  } catch (error) {
    console.warn(`Error fetching title for video ${videoId}:`, error);
    return null;
  }
}

/**
 * Fetch YouTube video title with fallback
 * @param videoId - YouTube video ID
 * @param fallback - Fallback title if fetch fails
 * @returns Promise resolving to title or fallback
 */
export async function fetchYouTubeTitleWithFallback(
  videoId: string, 
  fallback: string = `Video ${videoId}`
): Promise<string> {
  const title = await fetchYouTubeTitle(videoId);
  return title || fallback;
}
