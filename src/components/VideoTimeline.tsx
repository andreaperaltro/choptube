'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VideoTimelineProps {
  player: YT.Player | null;
  isPlayerReady: boolean;
  onTimestampSelect: (timestamp: number) => void;
  selectedTimestamp: number;
}

export default function VideoTimeline({ 
  player, 
  isPlayerReady, 
  onTimestampSelect, 
  selectedTimestamp 
}: VideoTimelineProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update current time periodically
  useEffect(() => {
    if (player && isPlayerReady) {
      const updateTime = () => {
        const time = player.getCurrentTime();
        const videoDuration = player.getDuration();
        setCurrentTime(time);
        setDuration(videoDuration);
      };

      intervalRef.current = setInterval(updateTime, 100);
      updateTime(); // Initial update

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [player, isPlayerReady]);

  // Listen for player state changes
  useEffect(() => {
    if (player && isPlayerReady) {
      const handleStateChange = () => {
        const state = player.getPlayerState();
        setIsPlaying(state === YT.PlayerState.PLAYING);
      };

      // Check state periodically
      const stateInterval = setInterval(handleStateChange, 100);
      handleStateChange(); // Initial check

      return () => clearInterval(stateInterval);
    }
  }, [player, isPlayerReady]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !player || !isPlayerReady || duration === 0) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    // Seek to the clicked position
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handlePlayPause = () => {
    if (!player || !isPlayerReady) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };


  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const selectedPercentage = duration > 0 ? (selectedTimestamp / duration) * 100 : 0;

  return (
    <div className="drum-machine-panel p-4 mb-6">
      <div className="flex items-center space-x-4 mb-4">
        <button
          onClick={handlePlayPause}
          disabled={!isPlayerReady}
          className="control-button p-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>
        
        <div className="text-gray-300 text-sm font-mono bg-gray-800 px-3 py-1 rounded border border-gray-600">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        
      </div>

      <div className="relative">
        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="timeline-track w-full h-8 cursor-pointer relative"
        >
          {/* Progress bar */}
          <div
            className="timeline-progress absolute left-0 top-0"
            style={{ width: `${progressPercentage}%` }}
          />
          
          {/* Selected timestamp marker */}
          {selectedTimestamp > 0 && (
            <div
              className="timeline-marker"
              style={{ left: `${selectedPercentage}%` }}
            />
          )}
          
          {/* Time markers */}
          <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-gray-400">
            <span>0:00</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="text-center mt-2 text-sm text-gray-400">
          Click on timeline to scrub • Current: {formatTime(currentTime)}
          {selectedTimestamp > 0 && ` • Selected: ${formatTime(selectedTimestamp)}`}
        </div>
      </div>
    </div>
  );
}
