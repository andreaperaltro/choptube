'use client';

import { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onPlayerReady: (player: YT.Player) => void;
  onPlayerStateChange?: (event: YT.OnStateChangeEvent) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({ videoId, onPlayerReady, onPlayerStateChange, onError }: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstanceRef = useRef<YT.Player | null>(null);
  const [isAPIReady, setIsAPIReady] = useState(false);

  useEffect(() => {
    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API loaded successfully');
        setIsAPIReady(true);
      };

      // Add timeout to handle API loading issues
      const timeout = setTimeout(() => {
        if (!window.YT) {
          console.error('YouTube API failed to load within 10 seconds');
        }
      }, 10000);

      return () => clearTimeout(timeout);
    } else {
      console.log('YouTube API already loaded');
      setIsAPIReady(true);
    }
  }, []);

  useEffect(() => {
    if (isAPIReady && playerRef.current && videoId && !playerInstanceRef.current) {
      console.log('Creating YouTube player for video:', videoId);
      
      // Create new player with error handling
            try {
              playerInstanceRef.current = new window.YT.Player(playerRef.current, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                  // Core functionality - iOS Safari optimized
                  playsinline: 1, // Critical for iOS Safari
                  enablejsapi: 1,
                  origin: window.location.origin,
                  
                  // Player behavior - iOS Safari compatible
                  autoplay: 0, // Disabled to respect autoplay policies
                  mute: 0, // Will be muted during preload
                  controls: 0, // Hide controls for cleaner UI
                  disablekb: 0, // Keep keyboard controls for accessibility
                  
                  // Visual customization (current parameters)
                  modestbranding: 1, // Reduce YouTube branding
                  color: 'white', // White progress bar
                  
                  // Hide distracting elements
                  rel: 0, // Show only related videos from same channel (post-2018 limitation)
                  iv_load_policy: 3, // Hide video annotations
                  cc_load_policy: 0, // Hide closed captions by default
                  fs: 1, // Allow fullscreen (removing this might help with end screens)
                  
                  // Additional parameters from official docs
                  start: 0, // Start from beginning
                },
          events: {
            onReady: (event: YT.PlayerEvent) => {
              console.log('YouTube player ready');
              
              // Set up a continuous monitor to hide suggestion elements
              const hideEndScreenElements = () => {
                try {
                  // Target the container around the iframe
                  const container = playerRef.current?.parentElement;
                  if (container) {
                    // Hide any YouTube suggestion overlays that might appear
                    const selectors = [
                      '.ytp-endscreen-content',
                      '.ytp-ce-element', 
                      '.ytp-cards-teaser',
                      '.ytp-pause-overlay',
                      '.html5-endscreen',
                      '.ytp-scroll-min',
                      '.ytp-videowall-still',
                      '[class*="endscreen"]',
                      '[class*="related"]'
                    ];
                    
                    selectors.forEach(selector => {
                      const elements = container.querySelectorAll(selector);
                      elements.forEach((el: Element) => {
                        (el as HTMLElement).style.display = 'none';
                        (el as HTMLElement).style.visibility = 'hidden';
                        (el as HTMLElement).style.opacity = '0';
                      });
                    });
                  }
                } catch {
                  // Silently handle any errors
                }
              };
              
              // Run immediately and then every 500ms
              hideEndScreenElements();
              const interval = setInterval(hideEndScreenElements, 500);
              
              // Store interval reference for cleanup
              (event.target as YT.Player & { _hideInterval?: NodeJS.Timeout })._hideInterval = interval;
              
              onPlayerReady(event.target);
            },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              console.log('YouTube player state changed:', event.data);
              
              // Hide end screen when video ends
              if (event.data === YT.PlayerState.ENDED) {
                setTimeout(() => {
                  // Try to hide end screen elements that might appear
                  const iframe = event.target.getIframe();
                  if (iframe && iframe.contentDocument) {
                    try {
                      const endScreenElements = iframe.contentDocument.querySelectorAll(
                        '.ytp-endscreen-content, .ytp-ce-element, .html5-endscreen'
                      );
                      endScreenElements.forEach((el: Element) => {
                        (el as HTMLElement).style.display = 'none';
                      });
                    } catch {
                      // Cross-origin restrictions may prevent this
                      console.log('Cannot access iframe content due to CORS');
                    }
                  }
                }, 100);
              }
              
              onPlayerStateChange?.(event);
            },
            onError: (event: YT.OnErrorEvent) => {
              console.error('YouTube player error:', event.data);
              let errorMessage = 'An error occurred while loading the video.';
              
              switch (event.data) {
                case 2:
                  errorMessage = 'Invalid video ID. Please check the YouTube URL.';
                  break;
                case 5:
                  errorMessage = 'The video is not available or has been removed.';
                  break;
                case 100:
                  errorMessage = 'The video is not available in your region.';
                  break;
                case 101:
                case 150:
                  errorMessage = 'The video owner has disabled embedding.';
                  break;
                default:
                  errorMessage = `Video error (${event.data}). Please try a different video.`;
              }
              
              onError?.(errorMessage);
            },
          },
        });
      } catch (error) {
        console.error('Failed to create YouTube player:', error);
      }
    }

    return () => {
      if (playerInstanceRef.current) {
        console.log('Destroying YouTube player');
        
        // Clean up the hide interval
        const interval = (playerInstanceRef.current as YT.Player & { _hideInterval?: NodeJS.Timeout })._hideInterval;
        if (interval) {
          clearInterval(interval);
        }
        
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [isAPIReady, videoId]); // Removed function dependencies to prevent infinite recreation

  return (
    <div className="w-full h-full youtube-player-container">
      <div ref={playerRef} className="w-full h-full" />
    </div>
  );
}
