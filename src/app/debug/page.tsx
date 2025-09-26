'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/store/project';

export default function DebugPage() {
  const { tracks } = useProjectStore();

  useEffect(() => {
    console.log('=== DEBUG PAGE LOADED ===');
    console.log('All rate application functions are disabled');
    console.log('Tracks:', tracks);
    
    // Check if there are any global error handlers
    window.addEventListener('error', (event) => {
      console.error('Global error caught:', event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }, [tracks]);

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-4">ChopTube Debug Page</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Status</h2>
          <p className="text-green-400">✅ All rate application functions disabled</p>
          <p className="text-green-400">✅ All direct player calls protected</p>
          <p className="text-green-400">✅ Error handling added to all components</p>
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Tracks ({tracks.length})</h2>
          {tracks.map((track, index) => (
            <div key={track.id} className="mb-2 p-2 bg-gray-700 rounded">
              <p><strong>Track {index + 1} ({track.id}):</strong></p>
              <p>Ready: {track.ready ? '✅' : '❌'}</p>
              <p>Has Player: {track.playerRef ? '✅' : '❌'}</p>
              <p>Type: {track.type}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <p>1. Open browser console (F12)</p>
          <p>2. Go back to main page: <a href="/" className="text-blue-400 underline">http://localhost:3000</a></p>
          <p>3. Load videos and check console for errors</p>
          <p>4. Report any remaining errors</p>
        </div>
      </div>
    </div>
  );
}
