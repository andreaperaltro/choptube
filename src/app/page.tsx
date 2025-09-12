'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Music, ExternalLink, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react';
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
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [pads, setPads] = useState<DrumPad[]>(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      label: `Pad ${i + 1}`,
      timestamp: -1, // Use -1 to indicate unset, 0+ for actual timestamps
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
      setCurrentVideoTime(0);
      setShowSuccessMessage(false);
    }
  }, [videoId]);

  // Track current video time
  useEffect(() => {
    if (!player || !isPlayerReady) return;

    const interval = setInterval(() => {
      try {
        const time = player.getCurrentTime();
        setCurrentVideoTime(time);
      } catch (error) {
        // Player might be destroyed or not ready
        console.warn('Could not get current time:', error);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [player, isPlayerReady]);

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
    setShowSuccessMessage(true);
    
    // Clear the loading timeout since video loaded successfully
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
    
    // Auto-dismiss success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000);
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
        // First pad should be at 0:00, not 0 (which is treated as empty)
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
          if (pad.timestamp >= 0) {
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
            onError={setError}
          />
        </div>
      )}

      {/* Overlay Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top Controls */}
        <div className="top-controls-bar px-4 py-3">
          <div className="w-full">
            <div className="flex items-center justify-between gap-2">
              {/* Logo */}
              <div className="flex items-center">
                <h1 className="text-lg font-medium text-white">ChopTube</h1>
              </div>
              
              {/* URL Input */}
              <form onSubmit={handleUrlSubmit} className="flex gap-1 flex-1 max-w-xs">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="YouTube URL..."
                    className={`flex-1 w-full px-3 py-1.5 rounded-lg border text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent text-xs transition-all duration-200 ${
                      error 
                        ? 'border-red-500 bg-red-900/20 focus:ring-red-500' 
                        : isPlayerReady 
                        ? 'border-green-500 bg-green-900/20 focus:ring-green-500'
                        : 'border-gray-600 bg-gray-800 focus:ring-blue-500'
                    }`}
                    disabled={isLoading}
                  />
                  {/* Status indicator */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isLoading ? (
                      <Loader2 className="w-2 h-2 text-blue-400 animate-spin" />
                    ) : error ? (
                      <AlertCircle className="w-2 h-2 text-red-400" />
                    ) : isPlayerReady ? (
                      <CheckCircle className="w-2 h-2 text-green-400" />
                    ) : null}
                  </div>
                </div>
                <button
                  type={buttonText === 'Paste' ? 'button' : 'submit'}
                  onClick={buttonText === 'Paste' ? handlePaste : undefined}
                  disabled={isLoading}
                  className="control-button px-2 py-1.5 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-xs transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-2 h-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-2 h-2" />
                  )}
                  <span>{isLoading ? 'Loading...' : buttonText}</span>
                </button>
              </form>

              {/* Control Buttons */}
              {isPlayerReady && (
                <div className="flex gap-1">
                  <button
                    onClick={handleAutoQuantize}
                    className="control-button px-2 py-1.5 font-medium flex items-center gap-1 text-xs"
                    title="Automatically distribute timestamps across the video"
                  >
                    <Music className="w-2 h-2" />
                    <span>Auto-Quantize</span>
                  </button>
                  <button
                    onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
                    className="control-button px-2 py-1.5 font-medium flex items-center gap-1 text-xs"
                    title="Show keyboard shortcuts"
                  >
                    <Info className="w-2 h-2" />
                    <span>Help</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-2 bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-2 h-2 flex-shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-300 hover:text-red-100 transition-colors ml-2"
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Success Message */}
            {showSuccessMessage && (
              <div className="mt-2 bg-green-500/20 border border-green-500/50 rounded-lg p-3 text-green-200 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-2 h-2 flex-shrink-0" />
                  <span>Video loaded successfully! Click empty pads to set timestamps, or use keyboard shortcuts.</span>
                </div>
                <button
                  onClick={() => setShowSuccessMessage(false)}
                  className="text-green-300 hover:text-green-100 transition-colors ml-2"
                  title="Dismiss message"
                >
                  ✕
                </button>
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
                currentVideoTime={currentVideoTime}
              />
            </div>
          </div>
        )}

        {/* Keyboard Help Overlay */}
        {showKeyboardHelp && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-600 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Keyboard Shortcuts</h3>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Drum Pads</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Row 1:</span>
                      <span className="text-white font-mono">4 5 6 7</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Row 2:</span>
                      <span className="text-white font-mono">R T Y U</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Row 3:</span>
                      <span className="text-white font-mono">D F G H</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Row 4:</span>
                      <span className="text-white font-mono">C V B N</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Controls</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Play/Pause:</span>
                      <span className="text-white font-mono">Spacebar</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Set timestamp:</span>
                      <span className="text-white">Press key on empty pad</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Play timestamp:</span>
                      <span className="text-white">Press key on set pad</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 border-t border-gray-600">
                  <p className="text-xs text-gray-400">
                    Tip: Click empty pads to set timestamps from current video position, or use the timeline to scrub to a specific time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions when no video */}
        {!videoId && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-white bg-black/50 backdrop-blur-sm rounded-lg p-6 sm:p-8 max-w-3xl">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">Welcome to ChopTube</h2>
              <p className="text-lg sm:text-xl mb-6 text-gray-300">
                Turn any YouTube video into a drum machine
              </p>
              
              <div className="space-y-4 text-left mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500 flex-shrink-0">1</div>
                  <p>Paste a YouTube URL above and click &quot;Load Video&quot;</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500 flex-shrink-0">2</div>
                  <p>Play the video and click any empty drum pad to set its timestamp</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500 flex-shrink-0">3</div>
                  <p>Click pads to play that section like a drum machine!</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold bg-blue-500 flex-shrink-0">4</div>
                  <p>Use keyboard shortcuts (4-7, R-T-Y-U, D-F-G-H, C-V-B-N) for quick access</p>
                </div>
              </div>

              <div className="border-t border-gray-600 pt-4">
                <h3 className="text-lg font-semibold mb-3">Try these examples:</h3>
                <div className="space-y-2 text-sm">
                  <button
                    onClick={() => setVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                    className="block w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    🎵 Rick Astley - Never Gonna Give You Up
                  </button>
                  <button
                    onClick={() => setVideoUrl('https://www.youtube.com/watch?v=9bZkp7q19f0')}
                    className="block w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    🎤 PSY - GANGNAM STYLE
                  </button>
                  <button
                    onClick={() => setVideoUrl('https://www.youtube.com/watch?v=L_jWHffIx5E')}
                    className="block w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                  >
                    🎸 Smells Like Teen Spirit - Nirvana
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}