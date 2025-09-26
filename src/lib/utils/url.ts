/**
 * URL utility functions
 * Provides URL normalization and validation
 */

/**
 * Normalize and trim a URL
 * @param url Raw URL input
 * @returns Cleaned URL string
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // Trim whitespace
  let cleaned = url.trim();
  
  // Remove common prefixes that users might accidentally include
  cleaned = cleaned.replace(/^(https?:\/\/)?(?:www\.)?/, '');
  
  // Handle different YouTube URL formats and normalize them
  if (cleaned.includes('youtube.com') || cleaned.includes('youtu.be')) {
    // If it doesn't start with protocol, add https://
    if (!cleaned.startsWith('http')) {
      cleaned = 'https://' + cleaned;
    }
    
    // Normalize www
    cleaned = cleaned.replace('://youtube.com', '://www.youtube.com');
    
    try {
      const urlObj = new URL(cleaned);
      
      // Handle youtu.be format
      if (urlObj.hostname === 'youtu.be') {
        const videoId = urlObj.pathname.slice(1); // Remove leading /
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
      
      // Handle youtube.com format
      if (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com') {
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`;
        }
        
        // Handle /embed/ format
        const embedMatch = urlObj.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
        if (embedMatch) {
          return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
        }
        
        // Handle /v/ format
        const vMatch = urlObj.pathname.match(/^\/v\/([a-zA-Z0-9_-]{11})/);
        if (vMatch) {
          return `https://www.youtube.com/watch?v=${vMatch[1]}`;
        }
      }
      
      return cleaned;
    } catch {
      // If URL parsing fails, return as-is
      return cleaned;
    }
  }
  
  // For non-YouTube URLs, just ensure protocol
  if (!cleaned.startsWith('http') && cleaned.includes('.')) {
    cleaned = 'https://' + cleaned;
  }
  
  return cleaned;
}

/**
 * Validate if a string looks like a valid URL
 * @param url URL string to validate
 * @returns true if it looks like a valid URL
 */
export function isValidUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  
  const normalized = normalizeUrl(url);
  
  try {
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate if a URL is a YouTube URL
 * @param url URL string to validate
 * @returns true if it's a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  const normalized = normalizeUrl(url);
  
  try {
    const urlObj = new URL(normalized);
    return urlObj.hostname === 'www.youtube.com' || 
           urlObj.hostname === 'youtube.com' || 
           urlObj.hostname === 'youtu.be';
  } catch {
    return false;
  }
}
