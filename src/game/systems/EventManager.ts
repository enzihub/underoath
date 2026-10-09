import * as Phaser from 'phaser';

type EventCallback = (...args: any[]) => void;

export enum GameEvents {
  ENEMY_DEFEATED = 'enemy-defeated',
  PLAYER_DAMAGED = 'player-damaged',
  ABILITY_USED = 'ability-used',
  GAME_OVER = 'game-over',
  VICTORY = 'victory',
  SCORE_ADDED = 'score-added',
  LEADERBOARD_UPDATED = 'leaderboard-updated',
  MENU_TOGGLED = 'menu-toggled',
  ENEMY_ATTACK = 'enemy-attack',
  ENEMY_DAMAGED = 'enemy-damaged',
}

/**
 * Centralized event management system for game events
 */
export default class EventManager {
  private static instance: EventManager;
  private emitter: Phaser.Events.EventEmitter;

  private constructor() {
    this.emitter = new Phaser.Events.EventEmitter();
  }

  /**
   * Get the singleton instance of EventManager
   */
  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  /**
   * Subscribe to a game event
   * @param event The event to subscribe to
   * @param callback The callback function to execute when the event occurs
   * @param context The context in which to execute the callback
   */
  public on(event: GameEvents, callback: EventCallback, context?: any): void {
    this.emitter.on(event, callback, context);
  }

  /**
   * Subscribe to a game event once
   * @param event The event to subscribe to
   * @param callback The callback function to execute when the event occurs
   * @param context The context in which to execute the callback
   */
  public once(event: GameEvents, callback: EventCallback, context?: any): void {
    this.emitter.once(event, callback, context);
  }

  /**
   * Unsubscribe from a game event
   * @param event The event to unsubscribe from
   * @param callback The callback function to remove
   * @param context The context of the callback
   */
  public off(event: GameEvents, callback?: EventCallback, context?: any): void {
    this.emitter.off(event, callback, context);
  }

  /**
   * Emit a game event
   * @param event The event to emit
   * @param args Any arguments to pass to the event listeners
   */
  public emit(event: GameEvents, ...args: any[]): void {
    this.emitter.emit(event, ...args);
  }

  /**
   * Remove all listeners for a specific event
   * @param event The event to clear listeners for
   */
  public removeAllListeners(event?: GameEvents): void {
    this.emitter.removeAllListeners(event);
  }

  /**
   * Destroy the event manager and all listeners
   */
  public destroy(): void {
    this.emitter.removeAllListeners();
  }
}
