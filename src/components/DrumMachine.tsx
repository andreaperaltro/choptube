'use client';

import { useState, useCallback, useRef } from 'react';
import { Plus, Minus, Settings } from 'lucide-react';

interface DrumPad {
  id: number;
  label: string;
  timestamp: number;
  isPlaying: boolean;
  color: string;
}

interface DrumMachineProps {
  onPadTrigger: (timestamp: number) => void;
  onPadStop: () => void;
  pads: DrumPad[];
  onUpdatePad: (id: number, timestamp: number) => void;
  selectedTimestamp: number;
  onTimestampSelect: (timestamp: number) => void;
  onSetTimestampFromCurrentTime: (padId: number) => void;
  currentVideoTime?: number;
}


export default function DrumMachine({ onPadTrigger, onPadStop, pads, onUpdatePad, selectedTimestamp, onSetTimestampFromCurrentTime, currentVideoTime = 0 }: DrumMachineProps) {
  const [editingPad, setEditingPad] = useState<number | null>(null);
  const [tempTimestamp, setTempTimestamp] = useState<string>('');
  const [settingsPad, setSettingsPad] = useState<number | null>(null);
  const [touchActivePad, setTouchActivePad] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef<boolean>(false);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getKeyForPad = (padId: number): string => {
    const keyMap: { [key: number]: string } = {
      0: '4', 1: '5', 2: '6', 3: '7',
      4: 'R', 5: 'T', 6: 'Y', 7: 'U',
      8: 'D', 9: 'F', 10: 'G', 11: 'H',
      12: 'C', 13: 'V', 14: 'B', 15: 'N',
    };
    return keyMap[padId] || '';
  };

  const parseTimeInput = (input: string): number => {
    // Support formats like "1:30", "90", "1m30s"
    const cleanInput = input.trim().toLowerCase();
    
    if (cleanInput.includes('m') && cleanInput.includes('s')) {
      const match = cleanInput.match(/(\d+)m(\d+)s/);
      if (match) {
        return parseInt(match[1]) * 60 + parseInt(match[2]);
      }
    }
    
    if (cleanInput.includes(':')) {
      const parts = cleanInput.split(':');
      if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
    }
    
    return parseInt(cleanInput) || 0;
  };

  const handlePadClick = useCallback((pad: DrumPad) => {
    if (pad.timestamp >= 0) {
      // Pad has a timestamp, play it
      onPadTrigger(pad.timestamp);
    } else {
      // Pad is empty, set timestamp from current video time
      onSetTimestampFromCurrentTime(pad.id);
    }
  }, [onPadTrigger, onSetTimestampFromCurrentTime]);

  // Long press handlers for touch devices
  const handleTouchStart = useCallback((pad: DrumPad, e: React.TouchEvent) => {
    isLongPressRef.current = false;
    setTouchActivePad(pad.id);
    
    longPressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (pad.timestamp >= 0) {
        setSettingsPad(pad.id);
      }
    }, 500); // 500ms for long press
  }, []);

  const handleTouchEnd = useCallback((pad: DrumPad, e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    
    setTouchActivePad(null);
    
    // Only trigger pad function if it wasn't a long press
    if (!isLongPressRef.current) {
      handlePadClick(pad);
    }
    
    isLongPressRef.current = false;
  }, [handlePadClick]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setTouchActivePad(null);
    isLongPressRef.current = false;
  }, []);

  const handlePadEdit = (pad: DrumPad) => {
    setEditingPad(pad.id);
    setTempTimestamp(pad.timestamp >= 0 ? formatTime(pad.timestamp) : '');
  };

  const handleTimestampSave = () => {
    if (editingPad !== null) {
      const timestamp = parseTimeInput(tempTimestamp);
      onUpdatePad(editingPad, timestamp);
      setEditingPad(null);
      setTempTimestamp('');
    }
  };

  const handleAdjustTimestamp = (padId: number, adjustment: number) => {
    const pad = pads.find(p => p.id === padId);
    if (pad && pad.timestamp >= 0) {
      const newTimestamp = Math.max(0, pad.timestamp + adjustment);
      onUpdatePad(padId, newTimestamp);
    }
  };


  const handleDeleteTimestamp = (padId: number) => {
    onUpdatePad(padId, -1);
    setSettingsPad(null);
  };

  const handleSettingsClick = (padId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent pad click
    setSettingsPad(settingsPad === padId ? null : padId);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleTimestampSave();
    } else if (event.key === 'Escape') {
      setEditingPad(null);
      setTempTimestamp('');
    }
  };

  return (
    <div className="w-full p-2 sm:p-4">
      <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-8 lg:gap-12 xl:gap-16 max-w-4xl mx-auto">
        {pads.map((pad) => {
          const padState = pad.timestamp < 0 ? 'unset' : pad.isPlaying ? 'playing' : 'set';
          const isNearCurrentTime = Math.abs(pad.timestamp - currentVideoTime) < 0.5; // Within 0.5 seconds
          
          return (
            <div key={pad.id} className="flex flex-col items-center space-y-1 sm:space-y-2">
              <div className={`relative drum-pad-container ${touchActivePad === pad.id ? 'touch-active' : ''}`}>
                <button
                  onClick={() => handlePadClick(pad)}
                  onTouchStart={(e) => handleTouchStart(pad, e)}
                  onTouchEnd={(e) => handleTouchEnd(pad, e)}
                  onTouchCancel={handleTouchCancel}
                  className={`
                    drum-pad w-12 h-12 xs:w-14 xs:h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28
                    flex flex-col items-center justify-center
                    ${padState}
                    backdrop-blur-sm group
                    min-h-[48px] min-w-[48px]
                  `}
                >
                  {/* Two-row layout */}
                  <div className="flex flex-col items-center justify-center space-y-1">
                    {/* Top row - Letter */}
                    <div className="text-xs sm:text-sm font-bold text-white bg-black/50 px-1 rounded">
                      {getKeyForPad(pad.id)}
                    </div>
                    
                    {/* Bottom row - Timestamp only */}
                    <div className="text-[10px] sm:text-xs md:text-sm text-white font-mono opacity-80">
                      {pad.timestamp >= 0 ? formatTime(pad.timestamp) : ''}
                    </div>
                  </div>
                  
                  {/* Current time indicator - bottom left corner */}
                  {isNearCurrentTime && pad.timestamp > 0 && (
                    <div className="absolute bottom-1 left-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" />
                  )}
                </button>
                
                {/* Settings icon - jumping from below */}
                {pad.timestamp >= 0 && (
                  <div className="drum-pad-settings">
                    <button
                      onClick={(e) => handleSettingsClick(pad.id, e)}
                      className="text-white hover:text-gray-300 transition-colors duration-200"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            
            <div className="text-center space-y-1 w-full relative">
              
              {editingPad === pad.id && (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={tempTimestamp}
                    onChange={(e) => setTempTimestamp(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="1:30 or 90"
                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <div className="flex space-x-1">
                    <button
                      onClick={handleTimestampSave}
                      className="control-button px-2 py-1 text-xs flex-1"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setEditingPad(null);
                        setTempTimestamp('');
                      }}
                      className="control-button px-2 py-1 text-xs flex-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
              
              {/* Settings Panel */}
              {settingsPad === pad.id && pad.timestamp >= 0 && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-2 sm:p-3 bg-white border border-gray-300 rounded-lg shadow-lg z-20 min-w-[180px] sm:min-w-[200px] max-w-[90vw]">
                  <div className="space-y-2 bg-white rounded">
                    <div className="text-xs text-gray-700 mb-2 bg-white px-1 py-0.5 rounded">Adjust Timestamp</div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleAdjustTimestamp(pad.id, -1)}
                        className="px-2 py-1 text-xs flex-1 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAdjustTimestamp(pad.id, 1)}
                        className="px-2 py-1 text-xs flex-1 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePadEdit(pad)}
                        className="px-2 py-1 text-xs flex-1 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTimestamp(pad.id)}
                        className="px-2 py-1 text-xs flex-1 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
        })}
      </div>
    </div>
  );
}
