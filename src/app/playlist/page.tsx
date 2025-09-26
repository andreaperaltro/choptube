'use client';

import { useState, useRef } from 'react';
import { usePlaylistStore, PlaylistVideo, Pad, exportPlaylistToJSON, importPlaylistFromJSON, validatePlaylistJSON } from '@/store/playlist';
import { parseYouTubeId, generateYouTubeUrl } from '@/lib/yt/url';
import Link from 'next/link';

/**
 * Playlist Editor Page
 * Dedicated page for managing video playlists and their timestamp pads
 */
export default function PlaylistPage() {
  const {
    videos,
    upsertVideo,
    removeVideo,
    appendPad,
    updatePad,
    removePad,
    // reorderPads, // TODO: Implement drag and drop functionality
    clear,
    getVideoCount,
    getTotalPadsCount
  } = usePlaylistStore();

  // UI State
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [newPadTime, setNewPadTime] = useState('');
  const [newPadLabel, setNewPadLabel] = useState('');
  const [editingPad, setEditingPad] = useState<{ videoId: string; index: number } | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedVideo = selectedVideoId ? videos.find(v => v.id === selectedVideoId) : null;

  /**
   * Add a new video to the playlist
   */
  const handleAddVideo = () => {
    const videoId = parseYouTubeId(newVideoUrl);
    if (!videoId) {
      alert('Please enter a valid YouTube URL');
      return;
    }

    const newVideo: PlaylistVideo = {
      id: videoId,
      url: generateYouTubeUrl(videoId),
      title: `Video ${videoId}`,
      notes: '',
      pads: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    upsertVideo(newVideo);
    setNewVideoUrl('');
    setSelectedVideoId(videoId);
  };

  /**
   * Add a new pad to the selected video
   */
  const handleAddPad = () => {
    if (!selectedVideoId || !newPadTime) return;

    const timeInSeconds = parseFloat(newPadTime);
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
      alert('Please enter a valid time in seconds');
      return;
    }

    const newPad: Pad = {
      tSec: timeInSeconds,
      label: newPadLabel || `Pad ${timeInSeconds}s`,
      offsetMs: 0,
    };

    appendPad(selectedVideoId, newPad);
    setNewPadTime('');
    setNewPadLabel('');
  };

  /**
   * Update video metadata
   */
  const handleUpdateVideo = (videoId: string, updates: Partial<PlaylistVideo>) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      upsertVideo({ ...video, ...updates });
    }
  };

  /**
   * Export playlist to JSON
   */
  const handleExport = () => {
    const exportData = exportPlaylistToJSON(videos);
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `choptube-playlist-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Import playlist from JSON
   */
  const handleImport = () => {
    try {
      const data = JSON.parse(importData);
      if (!validatePlaylistJSON(data)) {
        alert('Invalid playlist format');
        return;
      }

      const importedVideos = importPlaylistFromJSON(data);
      importedVideos.forEach(video => upsertVideo(video));
      
      setImportData('');
      setShowImportExport(false);
      alert(`Imported ${importedVideos.length} videos successfully`);
    } catch (error) {
      alert('Failed to import playlist: ' + (error as Error).message);
    }
  };

  /**
   * Import from file
   */
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportData(content);
    };
    reader.readAsText(file);
  };

  /**
   * Format time for display
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              ← Back to Editor
            </Link>
            <h1 className="text-2xl font-bold">Playlist Manager</h1>
            <div className="text-sm text-gray-400">
              {getVideoCount()} videos • {getTotalPadsCount()} pads total
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportExport(!showImportExport)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
            >
              Import/Export
            </button>
            <button
              onClick={() => confirm('Clear all videos?') && clear()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={videos.length === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Import/Export Panel */}
        {showImportExport && (
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Export</h3>
                <button
                  onClick={handleExport}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                  disabled={videos.length === 0}
                >
                  Export Playlist JSON
                </button>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Import</h3>
                <div className="space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Import from File
                  </button>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Or paste JSON here..."
                    className="w-full h-20 p-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                  />
                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import JSON
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Video List Sidebar */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Add Video Form */}
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Add Video</h3>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="YouTube URL"
                  className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                />
                <button
                  onClick={handleAddVideo}
                  disabled={!newVideoUrl.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Add Video
                </button>
              </div>
            </div>

            {/* Video List */}
            <div className="space-y-2">
              <h3 className="font-semibold">Videos ({videos.length})</h3>
              {videos.length === 0 ? (
                <p className="text-gray-400 text-sm">No videos added yet</p>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedVideoId === video.id
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    onClick={() => setSelectedVideoId(video.id)}
                  >
                    <div className="font-medium text-sm truncate">
                      {video.title || `Video ${video.id}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {video.pads.length} pads • {video.id}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm('Remove this video?') && removeVideo(video.id);
                      }}
                      className="mt-2 px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedVideo ? (
            <div className="space-y-6">
              {/* Video Info */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-4">Video Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={selectedVideo.title || ''}
                      onChange={(e) => handleUpdateVideo(selectedVideo.id, { title: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Video ID</label>
                    <input
                      type="text"
                      value={selectedVideo.id}
                      disabled
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">URL</label>
                    <input
                      type="text"
                      value={selectedVideo.url}
                      disabled
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Notes</label>
                    <textarea
                      value={selectedVideo.notes || ''}
                      onChange={(e) => handleUpdateVideo(selectedVideo.id, { notes: e.target.value })}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white h-20"
                      placeholder="Add notes about this video..."
                    />
                  </div>
                </div>
              </div>

              {/* Add Pad Form */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Add Timestamp Pad</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Time (seconds)</label>
                    <input
                      type="number"
                      value={newPadTime}
                      onChange={(e) => setNewPadTime(e.target.value)}
                      placeholder="12.5"
                      step="0.1"
                      min="0"
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Label</label>
                    <input
                      type="text"
                      value={newPadLabel}
                      onChange={(e) => setNewPadLabel(e.target.value)}
                      placeholder="Kick, Snare, etc."
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleAddPad}
                      disabled={!newPadTime}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      Add Pad
                    </button>
                  </div>
                </div>
              </div>

              {/* Pads List */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="font-semibold mb-4">Timestamp Pads ({selectedVideo.pads.length})</h3>
                {selectedVideo.pads.length === 0 ? (
                  <p className="text-gray-400">No pads added yet</p>
                ) : (
                  <div className="space-y-2">
                    {selectedVideo.pads
                      .map((pad, index) => ({ pad, index }))
                      .sort((a, b) => a.pad.tSec - b.pad.tSec)
                      .map(({ pad, index }) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {pad.label || `Pad ${index + 1}`}
                            </div>
                            <div className="text-sm text-gray-400">
                              {formatTime(pad.tSec)} ({pad.tSec}s)
                              {pad.offsetMs ? ` +${pad.offsetMs}ms` : ''}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingPad({ videoId: selectedVideo.id, index })}
                              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removePad(selectedVideo.id, index)}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">No Video Selected</h2>
                <p>Select a video from the sidebar to edit its details and pads</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Pad Modal */}
      {editingPad && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="font-semibold mb-4">Edit Pad</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Time (seconds)</label>
                <input
                  type="number"
                  defaultValue={selectedVideo?.pads[editingPad.index]?.tSec || 0}
                  step="0.1"
                  min="0"
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  id="edit-time"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Label</label>
                <input
                  type="text"
                  defaultValue={selectedVideo?.pads[editingPad.index]?.label || ''}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  id="edit-label"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Offset (ms)</label>
                <input
                  type="number"
                  defaultValue={selectedVideo?.pads[editingPad.index]?.offsetMs || 0}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
                  id="edit-offset"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditingPad(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const timeInput = document.getElementById('edit-time') as HTMLInputElement;
                    const labelInput = document.getElementById('edit-label') as HTMLInputElement;
                    const offsetInput = document.getElementById('edit-offset') as HTMLInputElement;
                    
                    const updatedPad: Pad = {
                      tSec: parseFloat(timeInput.value) || 0,
                      label: labelInput.value,
                      offsetMs: parseInt(offsetInput.value) || 0,
                    };
                    
                    updatePad(editingPad.videoId, editingPad.index, updatedPad);
                    setEditingPad(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
