'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Music, ExternalLink } from 'lucide-react';
import YouTubePlayer from '@/components/YouTubePlayer';
import DrumMachine from '@/components/DrumMachine';
import VideoTimeline from '@/components/VideoTimeline';

interface DrumPad {
  id: number;
  label: string;
  timestamp: number;
  isPlaying: boolean;
  color: string;
}

export default function Home() {
  const [videoId, setVideoId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [player, setPlayer] = useState<YT.Player | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);
  const [buttonText, setButtonText] = useState('Paste');
  const [pads, setPads] = useState<DrumPad[]>(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      label: `Pad ${i + 1}`,
      timestamp: 0,
      isPlaying: false,
      color: '',
    }))
  );
  const currentlyPlayingRef = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset pads when video changes
  useEffect(() => {
    if (videoId) {
      setPads(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef.current = null;
      setSelectedTimestamp(0);
    }
  }, [videoId]);

  // Update button text based on URL content
  useEffect(() => {
    if (videoUrl.trim()) {
      setButtonText('Load Video');
    } else {
      setButtonText('Paste');
    }
  }, [videoUrl]);

  const extractVideoId = (url: string): string => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setVideoUrl(text);
      setButtonText('Load Video');
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError('Failed to paste from clipboard. Please paste manually.');
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(videoUrl);
    if (id) {
      console.log('Loading video with ID:', id);
      setError(null);
      setIsLoading(true);
      
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Reset player state when loading new video
      setPlayer(null);
      setIsPlayerReady(false);
      setVideoId(id);
      
      // Set a timeout to show error if video doesn't load within 10 seconds
      loadingTimeoutRef.current = setTimeout(() => {
        setError('Video is taking too long to load. Please check the URL and try again.');
        setIsLoading(false);
      }, 10000);
    } else {
      setError('Please enter a valid YouTube URL');
    }
  };

  const handlePlayerReady = useCallback((playerInstance: YT.Player) => {
    console.log('Player ready callback triggered');
    setPlayer(playerInstance);
    setIsPlayerReady(true);
    setIsLoading(false);
    setError(null);
    
    // Clear the loading timeout since video loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  const handlePadTrigger = useCallback((timestamp: number) => {
    if (player && isPlayerReady) {
      try {
        console.log('Triggering pad at timestamp:', timestamp);
        
        // Find the pad that matches this timestamp
        const playingPadId = pads.find(pad => pad.timestamp === timestamp)?.id;
        
        if (playingPadId !== undefined) {
          // Reset all pads to not playing, then set the new one to playing
          setPads(prev => prev.map(pad => ({
            ...pad,
            isPlaying: pad.id === playingPadId
          })));
          
          // Update the currently playing reference
          currentlyPlayingRef.current = playingPadId;
        }

        // Seek to timestamp and play
        player.seekTo(timestamp, true);
        player.playVideo();
        
      } catch (error) {
        console.error('Error triggering pad:', error);
      }
    } else {
      console.warn('Player not ready or not available');
    }
  }, [player, isPlayerReady, pads]);

  const handlePadStop = useCallback(() => {
    if (player && isPlayerReady) {
      player.pauseVideo();
      
      // Update all pads to not playing
      setPads(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef.current = null;
    }
  }, [player, isPlayerReady]);

  const handleUpdatePad = useCallback((id: number, timestamp: number) => {
    setPads(prev => prev.map(pad => 
      pad.id === id 
        ? { ...pad, timestamp }
        : pad
    ));
  }, []);

  const handleSetTimestampFromCurrentTime = useCallback((padId: number) => {
    if (player && isPlayerReady) {
      const currentTime = player.getCurrentTime();
      handleUpdatePad(padId, currentTime);
    }
  }, [player, isPlayerReady, handleUpdatePad]);

  const handleAutoQuantize = useCallback(() => {
    if (player && isPlayerReady) {
      const duration = player.getDuration();
      if (duration > 0) {
        const segmentDuration = duration / 16;
        
        // Set each pad to the beginning of its segment
        setPads(prev => prev.map((pad, index) => ({
          ...pad,
          timestamp: index * segmentDuration
        })));
      }
    }
  }, [player, isPlayerReady]);

  const handlePlayerStateChange = useCallback((event: YT.OnStateChangeEvent) => {
    console.log('Player state changed to:', event.data);
    
    // When video ends or is paused, stop all pads
    if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
      setPads(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef.current = null;
    }
    
    // Clear any existing errors when video starts playing
    if (event.data === YT.PlayerState.PLAYING) {
      setError(null);
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Don't interfere with Cmd/Ctrl combinations (browser shortcuts)
      if (event.metaKey || event.ctrlKey) {
        return;
      }

      // Prevent default behavior for our keys only when not using modifiers
      if ('4567rtyudfghcvbn '.includes(key)) {
        event.preventDefault();
      }
      
      // Map keyboard keys to pad indices
      const keyToPadMap: { [key: string]: number } = {
        '4': 0, '5': 1, '6': 2, '7': 3,
        'r': 4, 't': 5, 'y': 6, 'u': 7,
        'd': 8, 'f': 9, 'g': 10, 'h': 11,
        'c': 12, 'v': 13, 'b': 14, 'n': 15,
      };

      if (key === ' ') {
        // Spacebar - toggle play/pause
        if (player && isPlayerReady) {
          const playerState = player.getPlayerState();
          if (playerState === YT.PlayerState.PLAYING) {
            player.pauseVideo();
          } else {
            player.playVideo();
          }
        }
      } else if (keyToPadMap[key] !== undefined) {
        const padId = keyToPadMap[key];
        const pad = pads[padId];
        if (pad) {
          if (pad.timestamp > 0) {
            // Pad has timestamp, play it
            handlePadTrigger(pad.timestamp);
          } else {
            // Pad is empty, set timestamp from current time
            handleSetTimestampFromCurrentTime(pad.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pads, handlePadTrigger, handlePadStop, handleSetTimestampFromCurrentTime, player, isPlayerReady]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Video */}
      {videoId && (
        <div className="fixed inset-0 z-0 w-full h-full">
          <YouTubePlayer
            videoId={videoId}
            onPlayerReady={handlePlayerReady}
            onPlayerStateChange={handlePlayerStateChange}
          />
        </div>
      )}

      {/* Overlay Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Controls */}
        <div className="top-controls-bar p-3">
          <div className="w-full">
            <div className="flex items-center justify-between space-x-4">
              {/* Logo */}
              <div className="flex items-center space-x-2">
                <Music className="w-5 h-5 text-white" />
                <h1 className="text-lg font-bold text-white">ChopTube</h1>
              </div>
              
              {/* URL Input */}
              <form onSubmit={handleUrlSubmit} className="flex space-x-2 flex-1 max-w-md">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube URL..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={isLoading}
                />
                <button
                  type={buttonText === 'Paste' ? 'button' : 'submit'}
                  onClick={buttonText === 'Paste' ? handlePaste : undefined}
                  disabled={isLoading}
                  className="control-button px-3 py-2 font-semibold flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{isLoading ? 'Loading...' : buttonText}</span>
                </button>
              </form>

              {/* Auto-Quantize Button */}
              {isPlayerReady && (
                <button
                  onClick={handleAutoQuantize}
                  className="control-button px-3 py-2 font-semibold flex items-center space-x-1 text-sm"
                >
                  <Music className="w-4 h-4" />
                  <span>Auto-Quantize</span>
                </button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-2 bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-red-200 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Drum Machine Overlay */}
        {isPlayerReady && (
          <div className="flex-1 flex items-center justify-center p-4 pt-20">
            <div className="w-full max-w-4xl">
              <DrumMachine
                onPadTrigger={handlePadTrigger}
                onPadStop={handlePadStop}
                pads={pads}
                onUpdatePad={handleUpdatePad}
                selectedTimestamp={selectedTimestamp}
                onTimestampSelect={setSelectedTimestamp}
                onSetTimestampFromCurrentTime={handleSetTimestampFromCurrentTime}
              />
            </div>
          </div>
        )}

        {/* Instructions when no video */}
        {!videoId && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-white bg-black/50 backdrop-blur-sm rounded-lg p-8 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Welcome to ChopTube</h2>
              <p className="text-xl mb-6 text-gray-300">
                Turn any YouTube video into a drum machine
              </p>
              <div className="space-y-4 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500">1</div>
                  <p>Paste a YouTube URL above and click &quot;Load Video&quot;</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500">2</div>
                  <p>Play the video and click any empty drum pad to set its timestamp</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500">3</div>
                  <p>Click pads to play that section like a drum machine!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}