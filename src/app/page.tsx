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
  // Video 1 state
  const [videoId1, setVideoId1] = useState<string>('');
  const [videoUrl1, setVideoUrl1] = useState<string>('');
  const [player1, setPlayer1] = useState<YT.Player | null>(null);
  const [isPlayerReady1, setIsPlayerReady1] = useState(false);
  const [isLoading1, setIsLoading1] = useState(false);
  const [error1, setError1] = useState<string | null>(null);
  const [currentVideoTime1, setCurrentVideoTime1] = useState(0);
  const [showSuccessMessage1, setShowSuccessMessage1] = useState(false);
  const [pads1, setPads1] = useState<DrumPad[]>(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      label: `Pad ${i + 1}`,
      timestamp: -1, // Use -1 to indicate unset, 0+ for actual timestamps
      isPlaying: false,
      color: '',
    }))
  );

  // Video 2 state
  const [videoId2, setVideoId2] = useState<string>('');
  const [videoUrl2, setVideoUrl2] = useState<string>('');
  const [player2, setPlayer2] = useState<YT.Player | null>(null);
  const [isPlayerReady2, setIsPlayerReady2] = useState(false);
  const [isLoading2, setIsLoading2] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const [currentVideoTime2, setCurrentVideoTime2] = useState(0);
  const [showSuccessMessage2, setShowSuccessMessage2] = useState(false);
  const [pads2, setPads2] = useState<DrumPad[]>(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      label: `Pad ${i + 1}`,
      timestamp: -1, // Use -1 to indicate unset, 0+ for actual timestamps
      isPlaying: false,
      color: '',
    }))
  );

  // Shared state
  const [selectedTimestamp, setSelectedTimestamp] = useState(0);
  const [buttonText1, setButtonText1] = useState('Paste');
  const [buttonText2, setButtonText2] = useState('Paste');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const currentlyPlayingRef1 = useRef<number | null>(null);
  const currentlyPlayingRef2 = useRef<number | null>(null);
  const loadingTimeoutRef1 = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeoutRef2 = useRef<NodeJS.Timeout | null>(null);

  // Reset pads when video 1 changes
  useEffect(() => {
    if (videoId1) {
      setPads1(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef1.current = null;
      setSelectedTimestamp(0);
      setCurrentVideoTime1(0);
      setShowSuccessMessage1(false);
    }
  }, [videoId1]);

  // Reset pads when video 2 changes
  useEffect(() => {
    if (videoId2) {
      setPads2(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef2.current = null;
      setSelectedTimestamp(0);
      setCurrentVideoTime2(0);
      setShowSuccessMessage2(false);
    }
  }, [videoId2]);

  // Track current video time for video 1
  useEffect(() => {
    if (!player1 || !isPlayerReady1) return;

    const interval = setInterval(() => {
      try {
        const time = player1.getCurrentTime();
        setCurrentVideoTime1(time);
      } catch (error) {
        // Player might be destroyed or not ready
        console.warn('Could not get current time for video 1:', error);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [player1, isPlayerReady1]);

  // Track current video time for video 2
  useEffect(() => {
    if (!player2 || !isPlayerReady2) return;

    const interval = setInterval(() => {
      try {
        const time = player2.getCurrentTime();
        setCurrentVideoTime2(time);
      } catch (error) {
        // Player might be destroyed or not ready
        console.warn('Could not get current time for video 2:', error);
      }
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [player2, isPlayerReady2]);

  // Update button text based on URL content for video 1
  useEffect(() => {
    if (videoUrl1.trim()) {
      setButtonText1('Load Video');
    } else {
      setButtonText1('Paste');
    }
  }, [videoUrl1]);

  // Update button text based on URL content for video 2
  useEffect(() => {
    if (videoUrl2.trim()) {
      setButtonText2('Load Video');
    } else {
      setButtonText2('Paste');
    }
  }, [videoUrl2]);

  const extractVideoId = (url: string): string => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : '';
  };

  const handlePaste1 = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setVideoUrl1(text);
      setButtonText1('Load Video');
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError1('Failed to paste from clipboard. Please paste manually.');
    }
  };

  const handlePaste2 = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setVideoUrl2(text);
      setButtonText2('Load Video');
    } catch (err) {
      console.error('Failed to read clipboard:', err);
      setError2('Failed to paste from clipboard. Please paste manually.');
    }
  };

  const handleUrlSubmit1 = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(videoUrl1);
    if (id) {
      console.log('Loading video 1 with ID:', id);
      setError1(null);
      setIsLoading1(true);
      
      // Clear any existing timeout
      if (loadingTimeoutRef1.current) {
        clearTimeout(loadingTimeoutRef1.current);
      }
      
      // Reset player state when loading new video
      setPlayer1(null);
      setIsPlayerReady1(false);
      setVideoId1(id);
      
      // Set a timeout to show error if video doesn't load within 10 seconds
      loadingTimeoutRef1.current = setTimeout(() => {
        setError1('Video is taking too long to load. Please check the URL and try again.');
        setIsLoading1(false);
      }, 10000);
    } else {
      setError1('Please enter a valid YouTube URL');
    }
  };

  const handleUrlSubmit2 = (e: React.FormEvent) => {
    e.preventDefault();
    const id = extractVideoId(videoUrl2);
    if (id) {
      console.log('Loading video 2 with ID:', id);
      setError2(null);
      setIsLoading2(true);
      
      // Clear any existing timeout
      if (loadingTimeoutRef2.current) {
        clearTimeout(loadingTimeoutRef2.current);
      }
      
      // Reset player state when loading new video
      setPlayer2(null);
      setIsPlayerReady2(false);
      setVideoId2(id);
      
      // Set a timeout to show error if video doesn't load within 10 seconds
      loadingTimeoutRef2.current = setTimeout(() => {
        setError2('Video is taking too long to load. Please check the URL and try again.');
        setIsLoading2(false);
      }, 10000);
    } else {
      setError2('Please enter a valid YouTube URL');
    }
  };

  const handlePlayerReady1 = useCallback((playerInstance: YT.Player) => {
    console.log('Player 1 ready callback triggered');
    setPlayer1(playerInstance);
    setIsPlayerReady1(true);
    setIsLoading1(false);
    setError1(null);
    setShowSuccessMessage1(true);
    
    // Clear the loading timeout since video loaded successfully
    if (loadingTimeoutRef1.current) {
      clearTimeout(loadingTimeoutRef1.current);
      loadingTimeoutRef1.current = null;
    }
    
    // Auto-dismiss success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage1(false);
    }, 5000);
  }, []);

  const handlePlayerReady2 = useCallback((playerInstance: YT.Player) => {
    console.log('Player 2 ready callback triggered');
    setPlayer2(playerInstance);
    setIsPlayerReady2(true);
    setIsLoading2(false);
    setError2(null);
    setShowSuccessMessage2(true);
    
    // Clear the loading timeout since video loaded successfully
    if (loadingTimeoutRef2.current) {
      clearTimeout(loadingTimeoutRef2.current);
      loadingTimeoutRef2.current = null;
    }
    
    // Auto-dismiss success message after 5 seconds
    setTimeout(() => {
      setShowSuccessMessage2(false);
    }, 5000);
  }, []);

  const handlePadTrigger1 = useCallback((timestamp: number) => {
    if (player1 && isPlayerReady1) {
      try {
        console.log('Triggering pad 1 at timestamp:', timestamp);
        
        // Stop the other video player (mixing functionality)
        if (player2 && isPlayerReady2) {
          player2.pauseVideo();
          // Reset all pads in video 2 to not playing
          setPads2(prev => prev.map(pad => ({
            ...pad,
            isPlaying: false
          })));
          currentlyPlayingRef2.current = null;
        }
        
        // Find the pad that matches this timestamp
        const playingPadId = pads1.find(pad => pad.timestamp === timestamp)?.id;
        
        if (playingPadId !== undefined) {
          // Reset all pads to not playing, then set the new one to playing
          setPads1(prev => prev.map(pad => ({
            ...pad,
            isPlaying: pad.id === playingPadId
          })));
          
          // Update the currently playing reference
          currentlyPlayingRef1.current = playingPadId;
        }

        // Seek to timestamp and play
        player1.seekTo(timestamp, true);
        player1.playVideo();
        
      } catch (error) {
        console.error('Error triggering pad 1:', error);
      }
    } else {
      console.warn('Player 1 not ready or not available');
    }
  }, [player1, isPlayerReady1, pads1, player2, isPlayerReady2]);

  const handlePadTrigger2 = useCallback((timestamp: number) => {
    if (player2 && isPlayerReady2) {
      try {
        console.log('Triggering pad 2 at timestamp:', timestamp);
        
        // Stop the other video player (mixing functionality)
        if (player1 && isPlayerReady1) {
          player1.pauseVideo();
          // Reset all pads in video 1 to not playing
          setPads1(prev => prev.map(pad => ({
            ...pad,
            isPlaying: false
          })));
          currentlyPlayingRef1.current = null;
        }
        
        // Find the pad that matches this timestamp
        const playingPadId = pads2.find(pad => pad.timestamp === timestamp)?.id;
        
        if (playingPadId !== undefined) {
          // Reset all pads to not playing, then set the new one to playing
          setPads2(prev => prev.map(pad => ({
            ...pad,
            isPlaying: pad.id === playingPadId
          })));
          
          // Update the currently playing reference
          currentlyPlayingRef2.current = playingPadId;
        }

        // Seek to timestamp and play
        player2.seekTo(timestamp, true);
        player2.playVideo();
        
      } catch (error) {
        console.error('Error triggering pad 2:', error);
      }
    } else {
      console.warn('Player 2 not ready or not available');
    }
  }, [player2, isPlayerReady2, pads2, player1, isPlayerReady1]);

  const handlePadStop1 = useCallback(() => {
    if (player1 && isPlayerReady1) {
      player1.pauseVideo();
      
      // Update all pads to not playing
      setPads1(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef1.current = null;
    }
  }, [player1, isPlayerReady1]);

  const handlePadStop2 = useCallback(() => {
    if (player2 && isPlayerReady2) {
      player2.pauseVideo();
      
      // Update all pads to not playing
      setPads2(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef2.current = null;
    }
  }, [player2, isPlayerReady2]);

  const handleUpdatePad1 = useCallback((id: number, timestamp: number) => {
    setPads1(prev => prev.map(pad => 
      pad.id === id 
        ? { ...pad, timestamp }
        : pad
    ));
  }, []);

  const handleUpdatePad2 = useCallback((id: number, timestamp: number) => {
    setPads2(prev => prev.map(pad => 
      pad.id === id 
        ? { ...pad, timestamp }
        : pad
    ));
  }, []);

  const handleSetTimestampFromCurrentTime1 = useCallback((padId: number) => {
    if (player1 && isPlayerReady1) {
      const currentTime = player1.getCurrentTime();
      handleUpdatePad1(padId, currentTime);
    }
  }, [player1, isPlayerReady1, handleUpdatePad1]);

  const handleSetTimestampFromCurrentTime2 = useCallback((padId: number) => {
    if (player2 && isPlayerReady2) {
      const currentTime = player2.getCurrentTime();
      handleUpdatePad2(padId, currentTime);
    }
  }, [player2, isPlayerReady2, handleUpdatePad2]);

  const handleAutoQuantize1 = useCallback(() => {
    if (player1 && isPlayerReady1) {
      const duration = player1.getDuration();
      if (duration > 0) {
        const segmentDuration = duration / 16;
        
        // Set each pad to the beginning of its segment
        // First pad should be at 0:00, not 0 (which is treated as empty)
        setPads1(prev => prev.map((pad, index) => ({
          ...pad,
          timestamp: index * segmentDuration
        })));
      }
    }
  }, [player1, isPlayerReady1]);

  const handleAutoQuantize2 = useCallback(() => {
    if (player2 && isPlayerReady2) {
      const duration = player2.getDuration();
      if (duration > 0) {
        const segmentDuration = duration / 16;
        
        // Set each pad to the beginning of its segment
        // First pad should be at 0:00, not 0 (which is treated as empty)
        setPads2(prev => prev.map((pad, index) => ({
          ...pad,
          timestamp: index * segmentDuration
        })));
      }
    }
  }, [player2, isPlayerReady2]);

  const handlePlayerStateChange1 = useCallback((event: YT.OnStateChangeEvent) => {
    console.log('Player 1 state changed to:', event.data);
    
    // When video ends or is paused, stop all pads
    if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
      setPads1(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef1.current = null;
    }
    
    // Clear any existing errors when video starts playing
    if (event.data === YT.PlayerState.PLAYING) {
      setError1(null);
    }
  }, []);

  const handlePlayerStateChange2 = useCallback((event: YT.OnStateChangeEvent) => {
    console.log('Player 2 state changed to:', event.data);
    
    // When video ends or is paused, stop all pads
    if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
      setPads2(prev => prev.map(pad => ({ ...pad, isPlaying: false })));
      currentlyPlayingRef2.current = null;
    }
    
    // Clear any existing errors when video starts playing
    if (event.data === YT.PlayerState.PLAYING) {
      setError2(null);
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
      if ('1234qwerasdfzxcv7890uiophjklbnm, '.includes(key)) {
        event.preventDefault();
      }
      
      // Map keyboard keys to pad indices for Video 1 (left side)
      const keyToPadMap1: { [key: string]: number } = {
        '1': 0, '2': 1, '3': 2, '4': 3,
        'q': 4, 'w': 5, 'e': 6, 'r': 7,
        'a': 8, 's': 9, 'd': 10, 'f': 11,
        'z': 12, 'x': 13, 'c': 14, 'v': 15,
      };

      // Map keyboard keys to pad indices for Video 2 (right side)
      const keyToPadMap2: { [key: string]: number } = {
        '7': 0, '8': 1, '9': 2, '0': 3,
        'u': 4, 'i': 5, 'o': 6, 'p': 7,
        'h': 8, 'j': 9, 'k': 10, 'l': 11,
        'b': 12, 'n': 13, 'm': 14, ',': 15,
      };

      if (key === ' ') {
        // Spacebar - toggle play/pause for whichever video is currently playing
        let handledSpacebar = false;
        
        // Check if video 1 is playing and pause it
        if (player1 && isPlayerReady1) {
          const playerState1 = player1.getPlayerState();
          if (playerState1 === YT.PlayerState.PLAYING) {
            player1.pauseVideo();
            handledSpacebar = true;
          }
        }
        
        // Check if video 2 is playing and pause it
        if (player2 && isPlayerReady2) {
          const playerState2 = player2.getPlayerState();
          if (playerState2 === YT.PlayerState.PLAYING) {
            player2.pauseVideo();
            handledSpacebar = true;
          }
        }
        
        // If nothing was playing, try to resume the last active video
        if (!handledSpacebar) {
          // Check which video has an active pad (isPlaying = true)
          const hasActivePad1 = pads1.some(pad => pad.isPlaying);
          const hasActivePad2 = pads2.some(pad => pad.isPlaying);
          
          if (hasActivePad1 && player1 && isPlayerReady1) {
            player1.playVideo();
          } else if (hasActivePad2 && player2 && isPlayerReady2) {
            player2.playVideo();
          } else if (player1 && isPlayerReady1) {
            // Default to player 1 if no active pads
            player1.playVideo();
          }
        }
      } else if (keyToPadMap1[key] !== undefined) {
        // Video 1 (left side) drum pad
        const padId = keyToPadMap1[key];
        const pad = pads1[padId];
        if (pad) {
          if (pad.timestamp >= 0) {
            // Pad has timestamp, play it
            handlePadTrigger1(pad.timestamp);
          } else {
            // Pad is empty, set timestamp from current time
            handleSetTimestampFromCurrentTime1(pad.id);
          }
        }
      } else if (keyToPadMap2[key] !== undefined) {
        // Video 2 (right side) drum pad
        const padId = keyToPadMap2[key];
        const pad = pads2[padId];
        if (pad) {
          if (pad.timestamp >= 0) {
            // Pad has timestamp, play it
            handlePadTrigger2(pad.timestamp);
          } else {
            // Pad is empty, set timestamp from current time
            handleSetTimestampFromCurrentTime2(pad.id);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [pads1, pads2, handlePadTrigger1, handlePadTrigger2, handleSetTimestampFromCurrentTime1, handleSetTimestampFromCurrentTime2, player1, player2, isPlayerReady1, isPlayerReady2]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Top Controls */}
      <div className="top-controls-bar px-4 py-3">
        <div className="w-full">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-lg font-medium text-white">ChopTube</h1>
            </div>
            
            {/* Help Button */}
            <button
              onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
              className="control-button px-3 py-2 font-medium flex items-center gap-2 text-sm"
              title="Show keyboard shortcuts"
            >
              <Info className="w-4 h-4" />
              <span>Help</span>
            </button>
          </div>

        </div>
      </div>

      {/* Dual Column Layout */}
      <div className="flex flex-row min-h-screen">
        {/* Video 1 Column */}
        <div className="flex-1 flex flex-col relative">
          {/* Video 1 Background - Full Column */}
          {videoId1 && (
            <div className="absolute inset-0 z-0 w-full h-full">
              <YouTubePlayer
                videoId={videoId1}
                onPlayerReady={handlePlayerReady1}
                onPlayerStateChange={handlePlayerStateChange1}
                onError={setError1}
              />
            </div>
          )}

          {/* Video 1 Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            {/* Video 1 Controls */}
            <div className="bg-black/80 backdrop-blur-sm p-4 border-b border-gray-600 relative z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-white min-w-[60px]">Video 1</h2>
                
                {/* Video 1 URL Input */}
                <form onSubmit={handleUrlSubmit1} className="flex gap-2 flex-1">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={videoUrl1}
                      onChange={(e) => setVideoUrl1(e.target.value)}
                      placeholder="YouTube URL for Video 1..."
                      className={`w-full px-3 py-2 rounded border text-white placeholder-gray-400 focus:outline-none focus:ring-1 text-sm ${
                        error1 
                          ? 'border-red-500 bg-red-900/20 focus:ring-red-500' 
                          : isPlayerReady1 
                          ? 'border-green-500 bg-green-900/20 focus:ring-green-500'
                          : 'border-gray-600 bg-gray-800 focus:ring-blue-500'
                      }`}
                      disabled={isLoading1}
                    />
                    {/* Status indicator */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {isLoading1 ? (
                        <Loader2 className="w-2 h-2 text-blue-400 animate-spin" />
                      ) : error1 ? (
                        <AlertCircle className="w-2 h-2 text-red-400" />
                      ) : isPlayerReady1 ? (
                        <CheckCircle className="w-2 h-2 text-green-400" />
                      ) : null}
                    </div>
                  </div>
                  <button
                    type={buttonText1 === 'Paste' ? 'button' : 'submit'}
                    onClick={buttonText1 === 'Paste' ? handlePaste1 : undefined}
                    disabled={isLoading1}
                    className="control-button px-3 py-2 text-sm"
                  >
                    {isLoading1 ? (
                      <Loader2 className="w-2 h-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-2 h-2" />
                    )}
                    {isLoading1 ? 'Loading...' : buttonText1}
                  </button>
                </form>
                
                {/* Auto-Quantize Button */}
                {isPlayerReady1 && (
                  <button
                    onClick={handleAutoQuantize1}
                    className="control-button px-3 py-2 text-sm"
                    title="Auto-quantize video 1"
                  >
                    <Music className="w-4 h-4" />
                    Auto-Quantize
                  </button>
                )}
              </div>

              {/* Video 1 Error Display */}
              {error1 && (
                <div className="mt-2 bg-red-500/20 border border-red-500/50 rounded p-2 text-red-200 text-xs">
                  {error1}
                </div>
              )}

              {/* Video 1 Success Message */}
              {showSuccessMessage1 && (
                <div className="mt-2 bg-green-500/20 border border-green-500/50 rounded p-2 text-green-200 text-xs">
                  Video 1 loaded successfully!
                </div>
              )}
            </div>

            {/* Video 1 Content */}
            {isPlayerReady1 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                  <DrumMachine
                    onPadTrigger={handlePadTrigger1}
                    onPadStop={handlePadStop1}
                    pads={pads1}
                    onUpdatePad={handleUpdatePad1}
                    selectedTimestamp={selectedTimestamp}
                    onTimestampSelect={setSelectedTimestamp}
                    onSetTimestampFromCurrentTime={handleSetTimestampFromCurrentTime1}
                    currentVideoTime={currentVideoTime1}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <h2 className="text-2xl font-bold text-white mb-4">Welcome to ChopTube</h2>
                  <div className="space-y-3 text-gray-300">
                    <p>1. Paste a YouTube URL above and click "Load Video"</p>
                    <p>2. Play the video and click any empty drum pad to set its timestamp</p>
                    <p>3. Click pads to play that section like a drum machine!</p>
                    <p>4. Use keyboard shortcuts (1-4, Q-R, A-F, Z-V) for quick access</p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-gray-400">Try these example videos:</p>
                    <div className="space-y-1 text-xs">
                      <button
                        onClick={() => setVideoUrl1('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                        className="block w-full text-left text-blue-400 hover:text-blue-300 underline"
                      >
                        • Rick Astley - Never Gonna Give You Up
                      </button>
                      <button
                        onClick={() => setVideoUrl1('https://www.youtube.com/watch?v=9bZkp7q19f0')}
                        className="block w-full text-left text-blue-400 hover:text-blue-300 underline"
                      >
                        • PSY - GANGNAM STYLE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Video 2 Column */}
        <div className="flex-1 flex flex-col relative">
          {/* Video 2 Background - Full Column */}
          {videoId2 && (
            <div className="absolute inset-0 z-0 w-full h-full">
              <YouTubePlayer
                videoId={videoId2}
                onPlayerReady={handlePlayerReady2}
                onPlayerStateChange={handlePlayerStateChange2}
                onError={setError2}
              />
            </div>
          )}

          {/* Video 2 Content */}
          <div className="relative z-10 flex-1 flex flex-col">
            {/* Video 2 Controls */}
            <div className="bg-black/80 backdrop-blur-sm p-4 border-b border-gray-600 relative z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-medium text-white min-w-[60px]">Video 2</h2>
                
                {/* Video 2 URL Input */}
                <form onSubmit={handleUrlSubmit2} className="flex gap-2 flex-1">
                  <div className="flex-1 relative">
                    <input
                      type="url"
                      value={videoUrl2}
                      onChange={(e) => setVideoUrl2(e.target.value)}
                      placeholder="YouTube URL for Video 2..."
                      className={`w-full px-3 py-2 rounded border text-white placeholder-gray-400 focus:outline-none focus:ring-1 text-sm ${
                        error2 
                          ? 'border-red-500 bg-red-900/20 focus:ring-red-500' 
                          : isPlayerReady2 
                          ? 'border-green-500 bg-green-900/20 focus:ring-green-500'
                          : 'border-gray-600 bg-gray-800 focus:ring-blue-500'
                      }`}
                      disabled={isLoading2}
                    />
                    {/* Status indicator */}
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      {isLoading2 ? (
                        <Loader2 className="w-2 h-2 text-blue-400 animate-spin" />
                      ) : error2 ? (
                        <AlertCircle className="w-2 h-2 text-red-400" />
                      ) : isPlayerReady2 ? (
                        <CheckCircle className="w-2 h-2 text-green-400" />
                      ) : null}
                    </div>
                  </div>
                  <button
                    type={buttonText2 === 'Paste' ? 'button' : 'submit'}
                    onClick={buttonText2 === 'Paste' ? handlePaste2 : undefined}
                    disabled={isLoading2}
                    className="control-button px-3 py-2 text-sm"
                  >
                    {isLoading2 ? (
                      <Loader2 className="w-2 h-2 animate-spin" />
                    ) : (
                      <ExternalLink className="w-2 h-2" />
                    )}
                    {isLoading2 ? 'Loading...' : buttonText2}
                  </button>
                </form>
                
                {/* Auto-Quantize Button */}
                {isPlayerReady2 && (
                  <button
                    onClick={handleAutoQuantize2}
                    className="control-button px-3 py-2 text-sm"
                    title="Auto-quantize video 2"
                  >
                    <Music className="w-4 h-4" />
                    Auto-Quantize
                  </button>
                )}
              </div>

              {/* Video 2 Error Display */}
              {error2 && (
                <div className="mt-2 bg-red-500/20 border border-red-500/50 rounded p-2 text-red-200 text-xs">
                  {error2}
                </div>
              )}

              {/* Video 2 Success Message */}
              {showSuccessMessage2 && (
                <div className="mt-2 bg-green-500/20 border border-green-500/50 rounded p-2 text-green-200 text-xs">
                  Video 2 loaded successfully!
                </div>
              )}
            </div>

            {/* Video 2 Content */}
            {isPlayerReady2 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                  <DrumMachine
                    onPadTrigger={handlePadTrigger2}
                    onPadStop={handlePadStop2}
                    pads={pads2}
                    onUpdatePad={handleUpdatePad2}
                    selectedTimestamp={selectedTimestamp}
                    onTimestampSelect={setSelectedTimestamp}
                    onSetTimestampFromCurrentTime={handleSetTimestampFromCurrentTime2}
                    currentVideoTime={currentVideoTime2}
                    isRightSide={true}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                  <h2 className="text-2xl font-bold text-white mb-4">Welcome to ChopTube</h2>
                  <div className="space-y-3 text-gray-300">
                    <p>1. Paste a YouTube URL above and click "Load Video"</p>
                    <p>2. Play the video and click any empty drum pad to set its timestamp</p>
                    <p>3. Click pads to play that section like a drum machine!</p>
                    <p>4. Use keyboard shortcuts (7-0, U-P, H-L, B-,) for quick access</p>
                  </div>
                  <div className="mt-6 space-y-2">
                    <p className="text-sm text-gray-400">Try these example videos:</p>
                    <div className="space-y-1 text-xs">
                      <button
                        onClick={() => setVideoUrl2('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}
                        className="block w-full text-left text-blue-400 hover:text-blue-300 underline"
                      >
                        • Rick Astley - Never Gonna Give You Up
                      </button>
                      <button
                        onClick={() => setVideoUrl2('https://www.youtube.com/watch?v=9bZkp7q19f0')}
                        className="block w-full text-left text-blue-400 hover:text-blue-300 underline"
                      >
                        • PSY - GANGNAM STYLE
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
                <h4 className="text-lg font-semibold text-white mb-2">Drum Pads (Video 1 - Left)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 1:</span>
                    <span className="text-white font-mono">1 2 3 4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 2:</span>
                    <span className="text-white font-mono">Q W E R</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 3:</span>
                    <span className="text-white font-mono">A S D F</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 4:</span>
                    <span className="text-white font-mono">Z X C V</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Drum Pads (Video 2 - Right)</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 1:</span>
                    <span className="text-white font-mono">7 8 9 0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 2:</span>
                    <span className="text-white font-mono">U I O P</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 3:</span>
                    <span className="text-white font-mono">H J K L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Row 4:</span>
                    <span className="text-white font-mono">B N M ,</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Controls</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Play/Pause (Video 1):</span>
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
                  Tip: Click empty pads to set timestamps from current video position. Each video has its own independent drum machine.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}