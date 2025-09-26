'use client';

import { useState, useRef, useEffect } from 'react';
import { usePlaylistStore, PlaylistVideo, Pad, exportPlaylistToJSON, importPlaylistFromJSON, validatePlaylistJSON } from '@/store/playlist';
import { useHydration } from '@/lib/hooks/useHydration';
import { parseYouTubeId } from '@/lib/yt/url';
import { normalizeUrl, isYouTubeUrl } from '@/lib/utils/url';
import { showSuccess, showError, showWarning, registerToast, ToastMessage, ToastOptions } from '@/lib/utils/toast';
import { showDangerConfirm, showWarningConfirm } from '@/lib/utils/confirm';
import { debugPlaylistData } from '@/lib/utils/debug';
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
    forceClear,
    getVideoCount,
    getTotalPadsCount
  } = usePlaylistStore();

  const isHydrated = useHydration();

  // UI State
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [urlError, setUrlError] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [newPadTime, setNewPadTime] = useState('');
  const [newPadLabel, setNewPadLabel] = useState('');
  const [editingPad, setEditingPad] = useState<{ videoId: string; index: number } | null>(null);
  const [showImportExport, setShowImportExport] = useState(false);
  const [importData, setImportData] = useState('');
  const [toastMessage, setToastMessage] = useState<ToastMessage>('');
  const [toastOptions, setToastOptions] = useState<ToastOptions>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedVideo = selectedVideoId ? videos.find(v => v.id === selectedVideoId) : null;

  // Register toast callback
  useEffect(() => {
    registerToast((message, options) => {
      setToastMessage(message);
      setToastOptions(options || {});
    });
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timeout = setTimeout(() => {
        setToastMessage('');
        setToastOptions({});
      }, toastOptions.duration || 4000);
      
      return () => clearTimeout(timeout);
    }
  }, [toastMessage, toastOptions.duration]);

  // Validate URL as user types
  const handleUrlChange = (value: string) => {
    setNewVideoUrl(value);
    
    if (value.trim() === '') {
      setUrlError('');
      return;
    }
    
    const normalized = normalizeUrl(value);
    if (!isYouTubeUrl(normalized)) {
      setUrlError('Please enter a valid YouTube URL');
    } else {
      setUrlError('');
    }
  };

  /**
   * Add a new video to the playlist
   */
  const handleAddVideo = () => {
    if (urlError) {
      showError('Please fix the URL error before adding');
      return;
    }

    const normalizedUrl = normalizeUrl(newVideoUrl);
    const videoId = parseYouTubeId(normalizedUrl);
    
    if (!videoId) {
      setUrlError('Invalid YouTube URL');
      showError('Please enter a valid YouTube URL');
      return;
    }

    const existingVideo = videos.find(v => v.id === videoId);
    const isUpdate = !!existingVideo;

    const newVideo: PlaylistVideo = {
      id: videoId,
      url: normalizedUrl,
      title: existingVideo?.title || `Video ${videoId}`,
      notes: existingVideo?.notes || '',
      pads: existingVideo?.pads || [],
      createdAt: existingVideo?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    upsertVideo(newVideo);
    setNewVideoUrl('');
    setUrlError('');
    setSelectedVideoId(videoId);
    
    showSuccess(isUpdate ? 'Video updated successfully' : 'Video added to playlist');
  };

  /**
   * Add a new pad to the selected video
   */
  const handleAddPad = () => {
    if (!selectedVideoId || !newPadTime) return;

    const timeInSeconds = parseFloat(newPadTime);
    if (isNaN(timeInSeconds) || timeInSeconds < 0) {
      showError('Please enter a valid time in seconds');
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
    
    showSuccess(`Pad added at ${timeInSeconds}s`);
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
    try {
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
      
      showSuccess(`Exported ${videos.length} videos to JSON file`);
    } catch (error) {
      console.error('Export failed:', error);
      showError('Failed to export playlist');
    }
  };

  /**
   * Import playlist from JSON
   */
  const handleImport = async () => {
    try {
      const data = JSON.parse(importData);
      if (!validatePlaylistJSON(data)) {
        showError('Invalid playlist format. Please check your JSON file.');
        return;
      }

      const importedVideos = importPlaylistFromJSON(data);
      const videoCount = importedVideos.length;
      
      if (videoCount === 0) {
        showWarning('No videos found in the playlist file');
        return;
      }

      // Confirm import if there are existing videos
      if (videos.length > 0) {
        const confirmed = await showWarningConfirm(
          `This will merge ${videoCount} videos with your existing playlist. Existing videos with the same ID will be updated. Continue?`,
          'Import Playlist'
        );
        
        if (!confirmed) return;
      }

      let updatedCount = 0;
      let addedCount = 0;

      importedVideos.forEach(video => {
        const exists = videos.some(v => v.id === video.id);
        if (exists) {
          updatedCount++;
        } else {
          addedCount++;
        }
        upsertVideo(video);
      });
      
      setImportData('');
      setShowImportExport(false);
      
      showSuccess(`Import complete: ${addedCount} added, ${updatedCount} updated`);
    } catch (error) {
      console.error('Import failed:', error);
      showError('Failed to parse JSON data. Please check your file format.');
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
              {isHydrated ? getVideoCount() : 0} videos • {isHydrated ? getTotalPadsCount() : 0} pads total
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
              onClick={async () => {
                const confirmed = await showDangerConfirm(
                  `This will permanently delete all ${isHydrated ? videos.length : 0} videos and their pads from your playlist. This action cannot be undone.`,
                  'Clear All Videos'
                );
                if (confirmed) {
                  console.log('🧹 Clearing playlist...', { before: videos.length });
                  clear();
                  console.log('🧹 Playlist cleared, checking store state...');
                  // Check if clear actually worked
                  setTimeout(() => {
                    console.log('🧹 After clear - videos count:', videos.length);
                    showSuccess('All videos cleared from playlist');
                    window.location.reload();
                  }, 100);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              disabled={!isHydrated || videos.length === 0}
            >
              Clear All
            </button>
            <button
              onClick={() => {
                debugPlaylistData();
                console.log('Current videos in store:', videos);
                console.log('Hydration status:', isHydrated);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Debug
            </button>
            <button
              onClick={async () => {
                const confirmed = await showDangerConfirm(
                  `FORCE CLEAR: This will bypass the store and directly clear localStorage, then reload the page. This is a nuclear option.`,
                  'Force Clear All Data'
                );
                if (confirmed) {
                  console.log('🧹 Force clearing all data...');
                  forceClear();
                }
              }}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
            >
              Force Clear
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
                  disabled={!isHydrated || videos.length === 0}
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
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="YouTube URL (paste any YouTube URL format)"
                  className={`w-full p-2 bg-gray-800 border rounded text-white ${
                    urlError 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-600 focus:ring-blue-500'
                  } focus:outline-none focus:ring-1`}
                  onKeyDown={(e) => e.key === 'Enter' && !urlError && handleAddVideo()}
                />
                {urlError && (
                  <p className="text-red-400 text-sm mt-1">{urlError}</p>
                )}
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
              <h3 className="font-semibold">Videos ({isHydrated ? videos.length : 0})</h3>
              {!isHydrated || videos.length === 0 ? (
                <p className="text-gray-400 text-sm">{!isHydrated ? "Loading..." : "No videos added yet"}</p>
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
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await showDangerConfirm(
                          `Remove "${video.title || video.id}" and all its ${video.pads.length} pads from the playlist?`,
                          'Remove Video'
                        );
                        if (confirmed) {
                          console.log('🗑️ Removing video:', video.id, 'Title:', video.title);
                          removeVideo(video.id);
                          if (selectedVideoId === video.id) {
                            setSelectedVideoId(null);
                          }
                          console.log('🗑️ Video removed, checking store state...');
                          setTimeout(() => {
                            console.log('🗑️ After remove - videos count:', videos.length);
                            showSuccess('Video removed from playlist');
                          }, 100);
                        }
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
                              onClick={async () => {
                                const confirmed = await showDangerConfirm(
                                  `Delete pad "${pad.label}" at ${pad.tSec}s?`,
                                  'Delete Pad'
                                );
                                if (confirmed) {
                                  removePad(selectedVideo.id, index);
                                  showSuccess('Pad deleted');
                                }
                              }}
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
                    showSuccess('Pad updated successfully');
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${
          toastOptions.type === 'error' 
            ? 'bg-red-600 text-white' 
            : toastOptions.type === 'warning'
            ? 'bg-yellow-600 text-white'
            : toastOptions.type === 'success'
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <div className="text-lg">
              {toastOptions.type === 'error' ? '❌' : 
               toastOptions.type === 'warning' ? '⚠️' : 
               toastOptions.type === 'success' ? '✅' : 'ℹ️'}
            </div>
            <div className="flex-1">
              {typeof toastMessage === 'string' ? toastMessage : toastMessage}
            </div>
            <button
              onClick={() => setToastMessage('')}
              className="text-white/80 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
