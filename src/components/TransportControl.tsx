'use client';

import { useState, useCallback } from 'react';
import { useProjectStore, useAllReady } from '@/store/project';
import { transportManager } from '@/lib/transport/TransportManager';
import { showSuccess, showWarning, showError } from '@/lib/utils/toast';

/**
 * Transport Control Component
 * Provides transport start/stop controls with lookahead management
 */
export default function TransportControl() {
  const { 
    tracks, 
    lookaheadMs, 
    setLookaheadMs, 
    isTransportRunning, 
    setTransportRunning 
  } = useProjectStore();
  
  const allReady = useAllReady();
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleStartTransport = useCallback(async () => {
    if (isStarting || isStopping) return;

    setIsStarting(true);
    
    try {
      // Warn if not all tracks are ready
      const notReadyCount = tracks.filter(track => !track.ready).length;
      if (notReadyCount > 0) {
        showWarning(`${notReadyCount} tracks not ready. Consider preloading first.`);
      }

      // Start transport with lookahead
      await transportManager.startTransport(
        tracks,
        lookaheadMs,
        (warning) => showWarning(warning)
      );

      setTransportRunning(true);
      showSuccess(`Transport started with ${lookaheadMs}ms lookahead`);
      
    } catch (error) {
      console.error('Failed to start transport:', error);
      showError(`Failed to start transport: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStarting(false);
    }
  }, [tracks, lookaheadMs, setTransportRunning, isStarting, isStopping]);

  const handleStopTransport = useCallback(async () => {
    if (isStopping || isStarting) return;

    setIsStopping(true);
    
    try {
      await transportManager.stopTransport(tracks);
      setTransportRunning(false);
      showSuccess('Transport stopped');
      
    } catch (error) {
      console.error('Failed to stop transport:', error);
      showError(`Failed to stop transport: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStopping(false);
    }
  }, [tracks, setTransportRunning, isStopping, isStarting]);

  const handleLookaheadChange = useCallback((ms: number) => {
    setLookaheadMs(ms);
  }, [setLookaheadMs]);

  const readyCount = tracks.filter(track => track.ready).length;
  const totalTracks = tracks.length;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Transport</h3>
        <div className="text-xs text-gray-400">
          {isTransportRunning ? 'Running' : 'Stopped'}
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Transport Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleStartTransport}
            disabled={isStarting || isStopping || totalTracks === 0}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-all duration-200 ${
              isStarting
                ? 'bg-yellow-600 text-white cursor-not-allowed'
                : totalTracks === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-500'
            }`}
          >
            {isStarting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                Starting...
              </span>
            ) : (
              '▶️ Start'
            )}
          </button>

          <button
            onClick={handleStopTransport}
            disabled={isStopping || isStarting || !isTransportRunning}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded transition-all duration-200 ${
              isStopping
                ? 'bg-yellow-600 text-white cursor-not-allowed'
                : !isTransportRunning
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-500'
            }`}
          >
            {isStopping ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                Stopping...
              </span>
            ) : (
              '⏹️ Stop'
            )}
          </button>
        </div>

        {/* Lookahead Control */}
        <div className="space-y-2">
          <label className="block text-xs text-gray-300">
            Lookahead: {lookaheadMs}ms
          </label>
          <input
            type="range"
            min="0"
            max="500"
            step="10"
            value={lookaheadMs}
            onChange={(e) => handleLookaheadChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg cursor-pointer"
            disabled={isTransportRunning}
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0ms</span>
            <span>500ms</span>
          </div>
        </div>

        {/* Status Info */}
        {totalTracks > 0 && (
          <div className="text-xs text-gray-400">
            <p>• {readyCount}/{totalTracks} tracks ready</p>
            <p>• Lookahead reduces first-hit latency</p>
            <p>• Start transport before playing pads</p>
          </div>
        )}

        {totalTracks === 0 && (
          <div className="text-xs text-gray-500">
            Load videos first to enable transport
          </div>
        )}
      </div>
    </div>
  );
}
