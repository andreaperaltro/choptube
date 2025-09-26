'use client';

import { useProjectStore } from '@/store/project';
import { clock } from '@/lib/clock/clock';
import { useEffect, useState } from 'react';

/**
 * BPM Control component
 * Provides BPM adjustment and tap tempo functionality
 */
export default function BpmControl() {
  const { bpm, setBpm } = useProjectStore();
  const [isTapping, setIsTapping] = useState(false);

  // Sync clock with store BPM
  useEffect(() => {
    clock.setBpm(bpm);
  }, [bpm]);

  // Listen for tempo changes from clock
  useEffect(() => {
    const unsubscribe = clock.onTempo((newBpm) => {
      setBpm(newBpm);
    });

    return unsubscribe;
  }, [setBpm]);

  const handleBpmChange = (newBpm: number) => {
    setBpm(newBpm);
  };

  const handleTapTempo = () => {
    setIsTapping(true);
    clock.tap();
    
    // Reset tapping state after animation
    setTimeout(() => setIsTapping(false), 200);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded">
      <label className="text-sm text-white">BPM:</label>
      <input
        type="number"
        value={bpm}
        onChange={(e) => handleBpmChange(Number(e.target.value))}
        min="60"
        max="200"
        className="w-16 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
      />
      <button
        onClick={handleTapTempo}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          isTapping 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-600 text-white hover:bg-gray-500'
        }`}
      >
        TAP
      </button>
    </div>
  );
}
