import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Track {
  id: string;
  type: 'youtube';
  playerRef?: unknown;
  label?: string;
  volume?: number;
  offsetMs?: number;
  rate: number; // Playback rate (default 1.0, YouTube discrete rates only)
  ready?: boolean;
}

interface ProjectState {
  bpm: number;
  globalRate: number;
  referenceBpm: number;
  quantizedRate: number; // New: Last applied quantized rate
  quantizeToYouTubeRates: boolean; // New: Whether to quantize to YouTube rates
  selectedTrackId: string | null; // Currently selected/focused track for shortcuts
  tracks: Track[];
  
  // Actions
  setBpm: (bpm: number) => void;
  setGlobalRate: (rate: number) => void;
  setReferenceBpm: (bpm: number) => void;
  setQuantizedRate: (rate: number) => void; // New: Action to set quantized rate
  setQuantizeToYouTubeRates: (enabled: boolean) => void; // New: Action to toggle quantization
  setSelectedTrackId: (trackId: string | null) => void; // New: Action to set selected track
  registerPlayer: (trackId: string, player: unknown) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackRate: (trackId: string, rate: number) => void;
  setTrackReady: (trackId: string, ready: boolean) => void;
  addTrack: (track: Track) => void;
  removeTrack: (trackId: string) => void;
  updateTrack: (trackId: string, updates: Partial<Track>) => void;
}

/**
 * Global project store for managing BPM, tracks, and player references
 * Persists BPM and tracks to localStorage
 */
export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      bpm: 120,
      globalRate: 1,
      referenceBpm: 120,
      quantizedRate: 1, // Default to 1x (no rate change)
      quantizeToYouTubeRates: true, // Default to enabled
      selectedTrackId: null, // No track selected by default
      tracks: [],

      setBpm: (bpm: number) => {
        set({ bpm });
      },

      setGlobalRate: (rate: number) => {
        set({ globalRate: rate });
      },

      setReferenceBpm: (bpm: number) => {
        set({ referenceBpm: bpm });
      },

      setQuantizedRate: (rate: number) => {
        set({ quantizedRate: rate });
      },

      setQuantizeToYouTubeRates: (enabled: boolean) => {
        set({ quantizeToYouTubeRates: enabled });
      },

      setSelectedTrackId: (trackId: string | null) => {
        set({ selectedTrackId: trackId });
      },

      registerPlayer: (trackId: string, player: unknown) => {
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, playerRef: player } : track
          ),
        }));
      },

      setTrackVolume: (trackId: string, volume: number) => {
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, volume } : track
          ),
        }));
      },

      setTrackRate: (trackId: string, rate: number) => {
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, playbackRate: rate } : track
          ),
        }));
      },

      setTrackReady: (trackId: string, ready: boolean) => {
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, ready } : track
          ),
        }));
      },

      addTrack: (track: Track) => {
        set((state) => ({
          tracks: [...state.tracks, track],
        }));
      },

      removeTrack: (trackId: string) => {
        set((state) => ({
          tracks: state.tracks.filter((track) => track.id !== trackId),
        }));
      },

      updateTrack: (trackId: string, updates: Partial<Track>) => {
        set((state) => ({
          tracks: state.tracks.map((track) =>
            track.id === trackId ? { ...track, ...updates } : track
          ),
        }));
      },
    }),
    {
      name: 'choptube-project',
      partialize: (state) => ({
        bpm: state.bpm,
        globalRate: state.globalRate,
        referenceBpm: state.referenceBpm,
        quantizedRate: state.quantizedRate, // Persist quantized rate
        quantizeToYouTubeRates: state.quantizeToYouTubeRates, // Persist quantization setting
        tracks: state.tracks.map(({ playerRef: _, ...track }) => track), // Exclude playerRef from persistence
      }),
    }
  )
);
