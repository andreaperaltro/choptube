import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BPM_CONFIG, PRELOAD_CONFIG, YOUTUBE_CONFIG } from '@/lib/config';

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
  leftVideoId: string | null; // Selected playlist video for left column
  rightVideoId: string | null; // Selected playlist video for right column
  lookaheadMs: number; // New: Lookahead time for transport (default 120ms)
  isTransportRunning: boolean; // New: Transport state
  preloadPlaylistCandidates: boolean; // New: Whether to preload playlist videos
  maxPlaylistPreloads: number; // New: Maximum number of playlist videos to preload
  tracks: Track[];
  
  // Actions
  setBpm: (bpm: number) => void;
  setGlobalRate: (rate: number) => void;
  setReferenceBpm: (bpm: number) => void;
  setQuantizedRate: (rate: number) => void; // New: Action to set quantized rate
  setQuantizeToYouTubeRates: (enabled: boolean) => void; // New: Action to toggle quantization
  setSelectedTrackId: (trackId: string | null) => void; // New: Action to set selected track
  setLeftVideoId: (videoId: string | null) => void; // New: Action to set left video
  setRightVideoId: (videoId: string | null) => void; // New: Action to set right video
  registerPlayer: (trackId: string, player: unknown) => void;
  setTrackVolume: (trackId: string, volume: number) => void;
  setTrackRate: (trackId: string, rate: number) => void;
  setTrackReady: (trackId: string, ready: boolean) => void;
  setAllReady: (ready: boolean) => void; // New: Set all tracks ready state
  setLookaheadMs: (ms: number) => void; // New: Set lookahead time
  setTransportRunning: (running: boolean) => void; // New: Set transport state
  setPreloadPlaylistCandidates: (enabled: boolean) => void; // New: Toggle playlist preloading
  setMaxPlaylistPreloads: (count: number) => void; // New: Set max playlist preloads
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
      bpm: BPM_CONFIG.DEFAULT_BPM,
      globalRate: YOUTUBE_CONFIG.DEFAULT_RATE,
      referenceBpm: BPM_CONFIG.DEFAULT_REFERENCE_BPM,
      quantizedRate: YOUTUBE_CONFIG.DEFAULT_RATE, // Default to 1x (no rate change)
      quantizeToYouTubeRates: BPM_CONFIG.DEFAULT_QUANTIZE_TO_YOUTUBE_RATES, // Default to enabled
      selectedTrackId: null, // No track selected by default
      leftVideoId: null, // No left video selected by default
      rightVideoId: null, // No right video selected by default
      lookaheadMs: PRELOAD_CONFIG.LOOKAHEAD_MS, // Default lookahead time
      isTransportRunning: false, // Transport not running by default
      preloadPlaylistCandidates: false, // Disabled by default
      maxPlaylistPreloads: PRELOAD_CONFIG.MAX_HIDDEN_PRELOADED_PLAYERS, // Default max playlist preloads
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

      setLeftVideoId: (videoId: string | null) => {
        set({ leftVideoId: videoId });
      },

      setRightVideoId: (videoId: string | null) => {
        set({ rightVideoId: videoId });
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
            track.id === trackId ? { ...track, rate } : track
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

      setAllReady: (ready: boolean) => {
        set((state) => ({
          tracks: state.tracks.map((track) => ({ ...track, ready })),
        }));
      },

      setLookaheadMs: (ms: number) => {
        set({ lookaheadMs: Math.max(0, Math.min(1000, ms)) }); // Clamp between 0-1000ms
      },

      setTransportRunning: (running: boolean) => {
        set({ isTransportRunning: running });
      },

      setPreloadPlaylistCandidates: (enabled: boolean) => {
        set({ preloadPlaylistCandidates: enabled });
      },

      setMaxPlaylistPreloads: (count: number) => {
        set({ maxPlaylistPreloads: Math.max(0, Math.min(10, count)) }); // Clamp between 0-10
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
        selectedTrackId: state.selectedTrackId, // Persist selected track ID
        leftVideoId: state.leftVideoId, // Persist left video selection
        rightVideoId: state.rightVideoId, // Persist right video selection
        lookaheadMs: state.lookaheadMs, // Persist lookahead setting
        preloadPlaylistCandidates: state.preloadPlaylistCandidates, // Persist playlist preload setting
        maxPlaylistPreloads: state.maxPlaylistPreloads, // Persist max playlist preloads
        tracks: state.tracks.map(({ playerRef, ...track }) => track), // Exclude playerRef from persistence
      }),
    }
  )
);

/**
 * Selector to check if all tracks are ready
 */
export const useAllReady = () => useProjectStore((state) => 
  state.tracks.length > 0 && state.tracks.every(track => track.ready === true)
);
