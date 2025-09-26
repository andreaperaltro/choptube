'use client';

import { useState, useEffect, useCallback } from 'react';
import { useProjectStore } from '@/store/project';

/**
 * BPM Panel component - VISUAL ONLY, no playback rate coupling
 * Tap tempo and BPM input are purely informational
 */
export default function BpmPanel() {
  const { bpm, setBpm } = useProjectStore();
  
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [isTapping, setIsTapping] = useState(false);

  const handleBpmChange = useCallback((newBpm: number) => {
    // Clamp BPM to valid range - VISUAL ONLY
    const clampedBpm = Math.max(20, Math.min(300, newBpm));
    setBpm(clampedBpm);
  }, [setBpm]);

  const handleTapTempo = useCallback(() => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now];
    
    // Keep only last 8 taps
    const recentTaps = newTapTimes.slice(-8);
    setTapTimes(recentTaps);
    setIsTapping(true);

    // Calculate BPM if we have at least 2 taps - VISUAL ONLY
    if (recentTaps.length >= 2) {
      const intervals: number[] = [];
      
      // Calculate intervals between consecutive taps
      for (let i = 1; i < recentTaps.length; i++) {
        intervals.push(recentTaps[i] - recentTaps[i - 1]);
      }

      if (intervals.length > 0) {
        // Sort intervals to find median (outlier detection)
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        const median = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
        
        // Filter out outliers (intervals that are more than 50% different from median)
        const filteredIntervals = intervals.filter(interval => 
          Math.abs(interval - median) / median < 0.5
        );

        if (filteredIntervals.length > 0) {
          const averageInterval = filteredIntervals.reduce((sum, interval) => sum + interval, 0) / filteredIntervals.length;
          const calculatedBpm = Math.round(60000 / averageInterval);
          
          // Only update if BPM is reasonable - VISUAL ONLY
          if (calculatedBpm >= 20 && calculatedBpm <= 300) {
            handleBpmChange(calculatedBpm);
            console.log(`🎵 Tap Tempo detected: ${calculatedBpm} BPM (visual only)`);
          }
        }
      }
    }

    // Reset tapping animation
    setTimeout(() => setIsTapping(false), 200);
  }, [tapTimes, handleBpmChange]);

  // Keyboard handler for 'T' key
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 't' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleTapTempo();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleTapTempo]);

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">BPM Reference</h3>
        <div className="text-xs text-gray-400">
          Press <kbd className="px-1 py-0.5 bg-gray-700 rounded text-xs">T</kbd> to tap
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mb-3 p-2 bg-gray-900 rounded text-xs text-gray-400">
        <strong className="text-yellow-300">⚠️ BPM does not change speed:</strong> 
        Use per-track Pitch controls below to change playback speed.
      </div>

      <div className="space-y-3">
        {/* BPM Input - Visual Only */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-white font-medium">BPM:</label>
          <input
            type="number"
            value={bpm}
            onChange={(e) => {
              const newBpm = Number(e.target.value);
              handleBpmChange(newBpm);
            }}
            min="20"
            max="300"
            className="w-20 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">(reference only)</span>
          <button
            onClick={handleTapTempo}
            className={`px-4 py-2 text-sm font-medium rounded transition-all duration-200 ${
              isTapping
                ? 'bg-blue-600 text-white scale-105'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            TAP
          </button>
        </div>

        {/* Tap History */}
        {tapTimes.length > 0 && (
          <div className="text-xs text-gray-400">
            Taps: {tapTimes.length}/8
            {tapTimes.length >= 2 && (
              <span className="ml-2 text-green-400">
                • Tempo detected: {bpm} BPM
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}