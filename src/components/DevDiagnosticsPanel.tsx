'use client';

import { useState, useEffect } from 'react';
import { useDiagnosticsStore, isDiagnosticsEnabled } from '@/store/diagnostics';
import { useProjectStore } from '@/store/project';

/**
 * Dev-only diagnostics panel for preload performance tracking
 */
export default function DevDiagnosticsPanel() {
  const { isEnabled, setEnabled, getAllMetrics, clearMetrics } = useDiagnosticsStore();
  const { tracks } = useProjectStore();
  const [isVisible, setIsVisible] = useState(false);

  // Check if diagnostics should be enabled on mount
  useEffect(() => {
    const shouldEnable = isDiagnosticsEnabled();
    if (shouldEnable) {
      setEnabled(true);
      setIsVisible(true);
    }
  }, [setEnabled]);

  // Toggle visibility with keyboard shortcut (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        setIsVisible(!isVisible);
        if (!isVisible) {
          setEnabled(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, setEnabled]);

  if (!isVisible) {
    return null;
  }

  const metrics = getAllMetrics();
  const trackMetrics = tracks.map(track => {
    const metric = metrics.find(m => m.trackId === track.id);
    return {
      track,
      metrics: metric || {
        trackId: track.id,
        lastPrerollTime: null,
        loadedFraction: 0,
        lastPlayLatency: null,
        lastPreloadAttempt: null,
      }
    };
  });

  return (
    <div className="fixed top-4 right-4 w-80 bg-gray-900 border border-gray-600 rounded-lg p-3 text-xs font-mono z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">🔧 Dev Diagnostics</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setEnabled(!isEnabled)}
            className={`px-2 py-1 rounded text-xs ${
              isEnabled 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-600 text-gray-300'
            }`}
          >
            {isEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={clearMetrics}
            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-500"
          >
            ×
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-400 mb-2">
        Press <kbd className="px-1 py-0.5 bg-gray-700 rounded">Ctrl+Shift+D</kbd> to toggle
      </div>

      {!isEnabled ? (
        <div className="text-gray-500 text-center py-4">
          Diagnostics disabled
        </div>
      ) : (
        <div className="space-y-3">
          {trackMetrics.map(({ track, metrics }) => (
            <div key={track.id} className="bg-gray-800 rounded p-2">
              <div className="font-semibold text-white mb-1">
                {track.label || track.id}
              </div>
              
              <div className="space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span>Loaded:</span>
                  <span className={metrics.loadedFraction > 0.05 ? 'text-green-400' : 'text-red-400'}>
                    {(metrics.loadedFraction * 100).toFixed(1)}%
                  </span>
                </div>
                
                {metrics.lastPrerollTime && (
                  <div className="flex justify-between">
                    <span>Last Preroll:</span>
                    <span className="text-blue-400">
                      {new Date(metrics.lastPrerollTime).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                
                {metrics.lastPlayLatency !== null && (
                  <div className="flex justify-between">
                    <span>Play Latency:</span>
                    <span className={metrics.lastPlayLatency < 100 ? 'text-green-400' : 'text-yellow-400'}>
                      {metrics.lastPlayLatency}ms
                    </span>
                  </div>
                )}
                
                {metrics.lastPreloadAttempt && (
                  <div className="flex justify-between">
                    <span>Last Attempt:</span>
                    <span className={metrics.lastPreloadAttempt.success ? 'text-green-400' : 'text-red-400'}>
                      {metrics.lastPreloadAttempt.success ? '✅' : '❌'}
                    </span>
                  </div>
                )}
                
                {metrics.lastPreloadAttempt?.error && (
                  <div className="text-red-400 text-xs truncate" title={metrics.lastPreloadAttempt.error}>
                    Error: {metrics.lastPreloadAttempt.error}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {trackMetrics.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              No tracks loaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}
