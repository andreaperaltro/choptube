'use client';

import { useEffect, useRef, useState } from 'react';

interface YouTubePlayerProps {
  videoId: string;
  onPlayerReady: (player: YT.Player) => void;
  onPlayerStateChange?: (event: YT.OnStateChangeEvent) => void;
}

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: () => void;
  }
}

export default function YouTubePlayer({ videoId, onPlayerReady, onPlayerStateChange }: YouTubePlayerProps) {
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
                  playsinline: 1,
                  controls: 1,
                  modestbranding: 1,
                  rel: 0,
                  enablejsapi: 1,
                  autoplay: 0,
                  mute: 0,
                  // Mobile performance optimizations
                  iv_load_policy: 3, // Hide annotations
                  cc_load_policy: 0, // Hide captions by default
                  fs: 0, // Disable fullscreen button
                  disablekb: 0, // Keep keyboard controls
                  start: 0, // Start from beginning
                  end: 0, // No end time
                },
          events: {
            onReady: (event: YT.PlayerEvent) => {
              console.log('YouTube player ready');
              onPlayerReady(event.target);
            },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              console.log('YouTube player state changed:', event.data);
              onPlayerStateChange?.(event);
            },
            onError: (event: YT.OnErrorEvent) => {
              console.error('YouTube player error:', event.data);
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
        playerInstanceRef.current.destroy();
        playerInstanceRef.current = null;
      }
    };
  }, [isAPIReady, videoId]); // Removed onPlayerReady and onPlayerStateChange from dependencies

  return (
    <div className="absolute inset-0 w-full h-full youtube-player-container">
      <div ref={playerRef} className="w-full h-full" />
    </div>
  );
}
