'use client';

import { useState, useCallback } from 'react';
import { Square, Plus, Minus, Settings } from 'lucide-react';

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
}


export default function DrumMachine({ onPadTrigger, onPadStop, pads, onUpdatePad, selectedTimestamp, onSetTimestampFromCurrentTime }: DrumMachineProps) {
  const [editingPad, setEditingPad] = useState<number | null>(null);
  const [tempTimestamp, setTempTimestamp] = useState<string>('');
  const [settingsPad, setSettingsPad] = useState<number | null>(null);

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
    if (pad.timestamp > 0) {
      // Pad has a timestamp, play it
      onPadTrigger(pad.timestamp);
    } else {
      // Pad is empty, set timestamp from current video time
      onSetTimestampFromCurrentTime(pad.id);
    }
  }, [onPadTrigger, onSetTimestampFromCurrentTime]);

  const handlePadEdit = (pad: DrumPad) => {
    setEditingPad(pad.id);
    setTempTimestamp(pad.timestamp > 0 ? formatTime(pad.timestamp) : '');
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
    if (pad && pad.timestamp > 0) {
      const newTimestamp = Math.max(0, pad.timestamp + adjustment);
      onUpdatePad(padId, newTimestamp);
    }
  };


  const handleDeleteTimestamp = (padId: number) => {
    onUpdatePad(padId, 0);
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
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
        {pads.map((pad) => {
          const padState = pad.timestamp === 0 ? 'unset' : pad.isPlaying ? 'playing' : 'set';
          
          return (
            <div key={pad.id} className="flex flex-col items-center space-y-3">
              <button
                onClick={() => handlePadClick(pad)}
                className={`
                  drum-pad w-20 h-20 md:w-24 md:h-24
                  flex flex-col items-center justify-center
                  ${padState}
                  relative
                `}
              >
                {pad.isPlaying ? (
                  <Square className="w-6 h-6 text-white" />
                ) : (
                  <div className="text-xs text-white font-mono opacity-80">
                    {pad.timestamp > 0 ? formatTime(pad.timestamp) : ''}
                  </div>
                )}
              </button>
            
            <div className="text-center space-y-2 w-full relative">
              <div className="flex items-center justify-center space-x-1">
                <div className="text-xs font-bold text-gray-300">
                  {getKeyForPad(pad.id)}
                </div>
                {pad.timestamp > 0 && (
                  <button
                    onClick={(e) => handleSettingsClick(pad.id, e)}
                    className="w-3 h-3 text-gray-400 hover:text-gray-300 transition-colors opacity-60 hover:opacity-100"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
              </div>
              
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
              {settingsPad === pad.id && pad.timestamp > 0 && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 p-3 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-20 min-w-[200px]">
                  <div className="space-y-2">
                    <div className="text-xs text-gray-300 mb-2">Adjust Timestamp</div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleAdjustTimestamp(pad.id, -1)}
                        className="control-button px-2 py-1 text-xs flex-1 flex items-center justify-center"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleAdjustTimestamp(pad.id, 1)}
                        className="control-button px-2 py-1 text-xs flex-1 flex items-center justify-center"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handlePadEdit(pad)}
                        className="control-button px-2 py-1 text-xs flex-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTimestamp(pad.id)}
                        className="control-button px-2 py-1 text-xs flex-1 bg-red-600 hover:bg-red-700"
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
      
      <div className="mt-6 text-center">
        <button
          onClick={onPadStop}
          className="control-button px-6 py-3 font-semibold flex items-center space-x-2 mx-auto"
        >
          <Square className="w-5 h-5" />
          <span>Stop All</span>
        </button>
      </div>
    </div>
  );
}
