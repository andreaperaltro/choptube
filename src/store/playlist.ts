import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Pad represents a timestamp/cue point in a video
 */
export interface Pad {
  label?: string;    // User-defined label for the pad
  tSec: number;      // Time in seconds
  offsetMs?: number; // Offset in milliseconds (for fine timing adjustments)
}

/**
 * PlaylistVideo represents a video with its associated pads/cue points
 */
export interface PlaylistVideo {
  id: string;        // YouTube video ID
  url: string;       // Original YouTube URL
  title?: string;    // Video title (user-provided or fetched)
  notes?: string;    // User notes about the video
  pads: Pad[];       // Array of timestamp pads
  createdAt: number; // Unix timestamp when added
  updatedAt: number; // Unix timestamp when last modified
}

/**
 * Playlist state interface
 */
interface PlaylistState {
  videos: PlaylistVideo[];
  
  // Actions
  upsertVideo: (video: PlaylistVideo) => void;
  removeVideo: (videoId: string) => void;
  appendPad: (videoId: string, pad: Pad) => void;
  updatePad: (videoId: string, index: number, pad: Pad) => void;
  removePad: (videoId: string, index: number) => void;
  reorderPads: (videoId: string, from: number, to: number) => void;
  clear: () => void;
  forceClear: () => void;
  
  // Utility actions
  getVideo: (videoId: string) => PlaylistVideo | undefined;
  getAllVideos: () => PlaylistVideo[];
  getVideoCount: () => number;
  getTotalPadsCount: () => number;
}

/**
 * Playlist store for managing video collections and their pads
 * Persists to localStorage for data persistence across sessions
 */
export const usePlaylistStore = create<PlaylistState>()(
  persist(
    (set, get) => ({
      videos: [],

      /**
       * Add or update a video in the playlist
       * If video with same ID exists, it will be updated
       */
      upsertVideo: (video: PlaylistVideo) => {
        set((state) => {
          const existingIndex = state.videos.findIndex(v => v.id === video.id);
          const now = Date.now();
          
          const updatedVideo = {
            ...video,
            updatedAt: now,
            createdAt: existingIndex >= 0 ? state.videos[existingIndex].createdAt : now,
          };

          if (existingIndex >= 0) {
            // Update existing video
            const newVideos = [...state.videos];
            newVideos[existingIndex] = updatedVideo;
            return { videos: newVideos };
          } else {
            // Add new video
            return { videos: [...state.videos, updatedVideo] };
          }
        });
      },

      /**
       * Remove a video from the playlist
       */
      removeVideo: (videoId: string) => {
        set((state) => ({
          videos: state.videos.filter(v => v.id !== videoId),
        }));
      },

      /**
       * Add a new pad to a specific video
       */
      appendPad: (videoId: string, pad: Pad) => {
        set((state) => ({
          videos: state.videos.map(video => 
            video.id === videoId 
              ? { 
                  ...video, 
                  pads: [...video.pads, pad],
                  updatedAt: Date.now()
                }
              : video
          ),
        }));
      },

      /**
       * Update an existing pad in a specific video
       */
      updatePad: (videoId: string, index: number, pad: Pad) => {
        set((state) => ({
          videos: state.videos.map(video => 
            video.id === videoId && index >= 0 && index < video.pads.length
              ? { 
                  ...video, 
                  pads: video.pads.map((p, i) => i === index ? pad : p),
                  updatedAt: Date.now()
                }
              : video
          ),
        }));
      },

      /**
       * Remove a pad from a specific video
       */
      removePad: (videoId: string, index: number) => {
        set((state) => ({
          videos: state.videos.map(video => 
            video.id === videoId && index >= 0 && index < video.pads.length
              ? { 
                  ...video, 
                  pads: video.pads.filter((_, i) => i !== index),
                  updatedAt: Date.now()
                }
              : video
          ),
        }));
      },

      /**
       * Reorder pads within a video (drag and drop support)
       */
      reorderPads: (videoId: string, from: number, to: number) => {
        set((state) => ({
          videos: state.videos.map(video => {
            if (video.id !== videoId || 
                from < 0 || from >= video.pads.length || 
                to < 0 || to >= video.pads.length) {
              return video;
            }

            const newPads = [...video.pads];
            const [movedPad] = newPads.splice(from, 1);
            newPads.splice(to, 0, movedPad);

            return {
              ...video,
              pads: newPads,
              updatedAt: Date.now()
            };
          }),
        }));
      },

      /**
       * Clear all videos from the playlist
       */
      clear: () => {
        console.log('🧹 Store clear called, current videos:', get().videos.length);
        set({ videos: [] });
        // Force clear localStorage as well to ensure it's completely cleared
        if (typeof window !== 'undefined') {
          localStorage.removeItem('choptube-playlist');
          console.log('🧹 localStorage cleared');
        }
      },

      /**
       * Force clear - bypasses store and directly clears localStorage
       */
      forceClear: () => {
        console.log('🧹 Force clear called');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('choptube-playlist');
          console.log('🧹 localStorage force cleared');
          // Force store update
          set({ videos: [] });
          // Reload page to ensure clean state
          window.location.reload();
        }
      },

      /**
       * Get a specific video by ID
       */
      getVideo: (videoId: string) => {
        return get().videos.find(v => v.id === videoId);
      },

      /**
       * Get all videos sorted by creation date (newest first)
       */
      getAllVideos: () => {
        return get().videos.sort((a, b) => b.createdAt - a.createdAt);
      },

      /**
       * Get total number of videos in playlist
       */
      getVideoCount: () => {
        return get().videos.length;
      },

      /**
       * Get total number of pads across all videos
       */
      getTotalPadsCount: () => {
        return get().videos.reduce((total, video) => total + video.pads.length, 0);
      },
    }),
    {
      name: 'choptube-playlist',
      partialize: (state) => ({
        videos: state.videos, // Only persist the videos array
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          console.log('🔄 Playlist store rehydrated with', state.videos.length, 'videos');
        }
      },
    }
  )
);

/**
 * JSON Schema types for export/import functionality
 */
export interface PlaylistExportSchema {
  version: 1;
  videos: {
    id: string;
    url: string;
    title?: string;
    notes?: string;
    pads: {
      label?: string;
      tSec: number;
      offsetMs?: number;
    }[];
  }[];
  exportedAt?: number; // Unix timestamp when exported
  exportedBy?: string; // Optional identifier
}

/**
 * Export playlist to JSON format
 */
export function exportPlaylistToJSON(videos: PlaylistVideo[]): PlaylistExportSchema {
  return {
    version: 1,
    videos: videos.map(video => ({
      id: video.id,
      url: video.url,
      title: video.title,
      notes: video.notes,
      pads: video.pads.map(pad => ({
        label: pad.label,
        tSec: pad.tSec,
        offsetMs: pad.offsetMs,
      })),
    })),
    exportedAt: Date.now(),
  };
}

/**
 * Import playlist from JSON format
 * @param jsonData - Playlist export schema
 * @returns Array of PlaylistVideo objects
 */
export function importPlaylistFromJSON(jsonData: PlaylistExportSchema): PlaylistVideo[] {
  // Validate version
  if (jsonData.version !== 1) {
    throw new Error(`Unsupported playlist version: ${jsonData.version}`);
  }

  const now = Date.now();
  
  return jsonData.videos.map(video => ({
    id: video.id,
    url: video.url,
    title: video.title,
    notes: video.notes,
    pads: video.pads || [],
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Validate playlist JSON schema
 */
export function validatePlaylistJSON(data: unknown): data is PlaylistExportSchema {
  if (!data || typeof data !== 'object') return false;
  
  const obj = data as Record<string, unknown>;
  
  // Check version
  if (obj.version !== 1) return false;
  
  // Check videos array
  if (!Array.isArray(obj.videos)) return false;
  
  // Validate each video
  return obj.videos.every(video => 
    typeof video === 'object' &&
    video !== null &&
    typeof (video as Record<string, unknown>).id === 'string' &&
    typeof (video as Record<string, unknown>).url === 'string' &&
    Array.isArray((video as Record<string, unknown>).pads)
  );
}
