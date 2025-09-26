import { BPM_CONFIG, CLOCK_CONFIG } from '@/lib/config';

/**
 * Clock class for managing timing and tempo
 * Provides BPM control and tempo change callbacks
 */
export class Clock {
  private bpm: number = CLOCK_CONFIG.DEFAULT_BPM;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private tempoCallbacks: Array<(bpm: number) => void> = [];
  private tapTimes: number[] = [];
  private tapTimeout: NodeJS.Timeout | null = null;

  /**
   * Start the clock
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.scheduleNextTick();
  }

  /**
   * Stop the clock
   */
  stop(): void {
    this.isRunning = false;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Tap tempo - records tap times and calculates BPM
   */
  tap(): void {
    const now = Date.now();
    this.tapTimes.push(now);

    // Keep only last 4 taps
    if (this.tapTimes.length > 4) {
      this.tapTimes = this.tapTimes.slice(-4);
    }

    // Clear existing timeout
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout);
    }

    // Calculate BPM if we have at least 2 taps
    if (this.tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < this.tapTimes.length; i++) {
        intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
      }
      
      const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const bpm = Math.round(60000 / averageInterval);
      
      // Only update if BPM is reasonable (use config limits)
      if (bpm >= BPM_CONFIG.MIN_BPM && bpm <= BPM_CONFIG.MAX_BPM) {
        this.setBpm(bpm);
      }
    }

    // Clear taps after 2 seconds of inactivity
    this.tapTimeout = setTimeout(() => {
      this.tapTimes = [];
    }, 2000);
  }

  /**
   * Register a callback for tempo changes
   */
  onTempo(callback: (bpm: number) => void): () => void {
    this.tempoCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.tempoCallbacks.indexOf(callback);
      if (index > -1) {
        this.tempoCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Set BPM and notify callbacks
   */
  setBpm(bpm: number): void {
    if (bpm < BPM_CONFIG.MIN_BPM || bpm > BPM_CONFIG.MAX_BPM) return;
    
    this.bpm = bpm;
    this.tempoCallbacks.forEach(callback => callback(bpm));
  }

  /**
   * Get current BPM
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Get current running state
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Schedule the next tick based on current BPM
   */
  private scheduleNextTick(): void {
    if (!this.isRunning) return;

    const intervalMs = 60000 / this.bpm;
    this.intervalId = setTimeout(() => {
      if (this.isRunning) {
        this.scheduleNextTick();
      }
    }, intervalMs);
  }
}

// Export a singleton instance
export const clock = new Clock();
