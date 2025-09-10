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
      // Reset player state when loading new video
      setPlayer(null);
      setIsPlayerReady(false);
      setVideoId(id);
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
  }, []);

  const handlePadTrigger = useCallback((timestamp: number) => {
    if (player && isPlayerReady) {
      try {
        console.log('Triggering pad at timestamp:', timestamp);
        
        // Stop currently playing pad
        if (currentlyPlayingRef.current !== null) {
          setPads(prev => prev.map(pad => 
            pad.id === currentlyPlayingRef.current 
              ? { ...pad, isPlaying: false }
              : pad
          ));
        }

        // Seek to timestamp and play
        player.seekTo(timestamp, true);
        player.playVideo();
        
        // Find and update the playing pad
        const playingPadId = pads.find(pad => pad.timestamp === timestamp)?.id;
        if (playingPadId !== undefined) {
          setPads(prev => prev.map(pad => 
            pad.id === playingPadId 
              ? { ...pad, isPlaying: true }
              : pad
          ));
          currentlyPlayingRef.current = playingPadId;
        }
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
    
    // Handle errors
    if (event.data === YT.PlayerState.UNSTARTED) {
      setError('Failed to load video. Please check the URL and try again.');
      setIsLoading(false);
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
  }, [pads, handlePadTrigger, handlePadStop, handleSetTimestampFromCurrentTime]);

  return (
    <div className="min-h-screen" style={{ background: 'var(--drum-machine-bg)' }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Music className="w-8 h-8" style={{ color: 'var(--drum-machine-accent)' }} />
            <h1 className="text-4xl font-bold" style={{ color: 'var(--drum-machine-text)' }}>ChopTube</h1>
          </div>
          <p className="text-xl mb-6" style={{ color: 'var(--drum-machine-text-dim)' }}>
            Turn any YouTube video into a drum machine
          </p>
        </div>

        {/* URL Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
            <div className="flex space-x-4">
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="Paste YouTube URL here..."
                className="flex-1 px-4 py-3 rounded-lg border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
                      <button
                        type={buttonText === 'Paste' ? 'button' : 'submit'}
                        onClick={buttonText === 'Paste' ? handlePaste : undefined}
                        disabled={isLoading}
                        className="control-button px-6 py-3 font-semibold flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>{isLoading ? 'Loading...' : buttonText}</span>
                      </button>
            </div>
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-200">
                {error}
              </div>
            )}
          </form>
        </div>

        {/* YouTube Player */}
        {videoId && (
          <div className="mb-8">
            <YouTubePlayer
              videoId={videoId}
              onPlayerReady={handlePlayerReady}
              onPlayerStateChange={handlePlayerStateChange}
            />
          </div>
        )}

        {/* Video Timeline */}
        {isPlayerReady && (
          <div className="mb-8">
            <VideoTimeline
              player={player}
              isPlayerReady={isPlayerReady}
              onTimestampSelect={setSelectedTimestamp}
              selectedTimestamp={selectedTimestamp}
            />
          </div>
        )}


        {/* Drum Machine */}
        {isPlayerReady && (
          <div className="drum-machine-panel p-6">
                    <h2 className="text-2xl font-bold text-center mb-6" style={{ color: 'var(--drum-machine-text)' }}>
                      Drum Machine
                    </h2>
                    <p className="text-center mb-4" style={{ color: 'var(--drum-machine-text-dim)' }}>
                      Play the video and click any empty pad to set its timestamp to the current time. 
                      Click the settings icon on pads to adjust timestamps or delete them. Click pads to play!
                    </p>
                    
                    {/* Auto-Quantize Button */}
                    <div className="text-center mb-6">
                      <button
                        onClick={handleAutoQuantize}
                        className="control-button px-6 py-3 font-semibold flex items-center space-x-2 mx-auto"
                      >
                        <Music className="w-5 h-5" />
                        <span>Auto-Quantize (16 Parts)</span>
                      </button>
                      <p className="text-xs text-gray-400 mt-2">
                        Automatically divide the video into 16 equal parts and set each pad
                      </p>
                    </div>
            
            {/* Keyboard Layout */}
            <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-600">
              <div className="text-center text-sm text-gray-300 mb-3">Keyboard Controls</div>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                <div className="flex justify-center space-x-1">
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">4</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">5</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">6</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">7</kbd>
                </div>
                <div className="flex justify-center space-x-1">
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">R</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">T</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">Y</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">U</kbd>
                </div>
                <div className="flex justify-center space-x-1">
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">D</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">F</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">G</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">H</kbd>
                </div>
                <div className="flex justify-center space-x-1">
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">C</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">V</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">B</kbd>
                  <kbd className="px-2 py-1 bg-gray-700 rounded border border-gray-600">N</kbd>
                </div>
              </div>
              <div className="text-center mt-3">
                <kbd className="px-4 py-1 bg-gray-700 rounded border border-gray-600 text-xs">SPACEBAR</kbd>
                <span className="text-xs text-gray-400 ml-2">- Play/Pause</span>
              </div>
            </div>
            
            {/* Color Legend */}
            <div className="flex justify-center space-x-6 mb-6 text-xs" style={{ color: 'var(--drum-machine-text-dim)' }}>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-gray-500 bg-gray-700"></div>
                <span>Unset</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-700"></div>
                <span>Set</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded border-2 border-blue-500 bg-blue-700"></div>
                <span>Playing</span>
              </div>
            </div>
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
        )}

        {/* Instructions */}
        {!videoId && (
          <div className="max-w-2xl mx-auto text-center">
            <div className="drum-machine-panel p-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--drum-machine-text)' }}>How to Use</h2>
              <div className="space-y-4" style={{ color: 'var(--drum-machine-text-dim)' }}>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--drum-machine-accent)' }}>1</div>
                  <p>Paste a YouTube URL above and click "Load Video"</p>
                </div>
                        <div className="flex items-start space-x-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--drum-machine-accent)' }}>2</div>
                          <p>Play the video and click any empty drum pad to set its timestamp to the current time</p>
                        </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: 'var(--drum-machine-accent)' }}>3</div>
                  <p>Click the pad to play that section of the video like a drum machine!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}