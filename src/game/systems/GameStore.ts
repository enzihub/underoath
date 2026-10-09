import * as Phaser from 'phaser';

const LEADERBOARD_KEY = 'underoath_leaderboard';

// Interface for player score data
export interface PlayerScore {
  username: string;
  score: number;
  enemiesDefeated: number;
  timePlayed: number;
  level: number;
  defeatedBoss: boolean;
  timestamp: number;
}

/**
 * Centralized store for game state that persists across game instances
 */
export default class GameStore {
  private static instance: GameStore;
  private leaderboard: PlayerScore[] = [];
  private eventEmitter: Phaser.Events.EventEmitter;

  // Game instance ID to differentiate between multiple game instances
  private gameInstanceId: string = '';

  private constructor() {
    this.eventEmitter = new Phaser.Events.EventEmitter();
    this.gameInstanceId = this.generateUniqueId();

    // Load leaderboard data from server
    this.fetchLeaderboard();
  }

  /**
   * Load the leaderboard from this browser's localStorage.
   * (The original build used a Next.js API route; the static build keeps
   * scores per browser so the game can run on any static host.)
   */
  private async fetchLeaderboard(): Promise<void> {
    try {
      const raw =
        typeof localStorage !== 'undefined' ? localStorage.getItem(LEADERBOARD_KEY) : null;
      this.leaderboard = raw ? (JSON.parse(raw) as PlayerScore[]) : [];
      this.sortLeaderboard();
      this.eventEmitter.emit('leaderboard-updated', this.leaderboard);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.leaderboard = [];
    }
  }

  /**
   * Persist the leaderboard to localStorage (top 50 scores).
   */
  private async saveScores(_score: PlayerScore): Promise<void> {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(this.leaderboard.slice(0, 50)));
      }
    } catch (error) {
      console.error('Failed to save leaderboard:', error);
    }
  }

  /**
   * Get the singleton instance of GameStore
   */
  public static getInstance(): GameStore {
    if (!GameStore.instance) {
      GameStore.instance = new GameStore();
    }
    return GameStore.instance;
  }

  /**
   * Generate a unique ID for the game instance
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Get the current game instance ID
   */
  public getGameInstanceId(): string {
    return this.gameInstanceId;
  }

  /**
   * Add a player score to the leaderboard
   */
  public addScore(score: PlayerScore): void {
    // Add to local cache
    this.leaderboard.push(score);

    // Sort leaderboard by score in descending order
    this.sortLeaderboard();

    // Persist locally
    this.saveScores(score);

    // Emit event
    this.eventEmitter.emit('leaderboard-updated', this.leaderboard);
  }

  /**
   * Get the leaderboard
   */
  public getLeaderboard(): PlayerScore[] {
    return [...this.leaderboard];
  }

  /**
   * Sort the leaderboard by score in descending order
   */
  private sortLeaderboard(): void {
    this.leaderboard.sort((a, b) => b.score - a.score);
  }

  /**
   * Subscribe to leaderboard updates
   */
  public onLeaderboardUpdate(
    callback: (leaderboard: PlayerScore[]) => void,
    context?: any,
  ): void {
    this.eventEmitter.on('leaderboard-updated', callback, context);
  }

  /**
   * Unsubscribe from leaderboard updates
   */
  public offLeaderboardUpdate(
    callback: (leaderboard: PlayerScore[]) => void,
    context?: any,
  ): void {
    this.eventEmitter.off('leaderboard-updated', callback, context);
  }

  /**
   * Clear the leaderboard
   */
  public async clearLeaderboard(): Promise<void> {
    this.leaderboard = [];
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LEADERBOARD_KEY);
    }
    this.eventEmitter.emit('leaderboard-updated', this.leaderboard);
  }

  /**
   * Reload leaderboard from storage
   */
  public async refreshLeaderboard(): Promise<void> {
    await this.fetchLeaderboard();
  }
}
