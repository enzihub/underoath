// You can write more code here

import EventManager, { GameEvents } from '../systems/EventManager';

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class BattleLogPrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number) {
    super(scene, x ?? 960, y ?? 540);

    // background
    const background = scene.add.rectangle(0, 0, 128, 128);
    background.scaleX = 2.543535200319656;
    background.scaleY = 2.543535200319656;
    background.isFilled = true;
    background.fillColor = 0;
    background.fillAlpha = 0.25;
    this.add(background);

    // titleText
    const titleText = scene.add.text(2, -133, '', {});
    titleText.setOrigin(0.5, 0.5);
    titleText.text = 'Battle Logs';
    titleText.setStyle({});
    this.add(titleText);

    this.background = background;
    this.titleText = titleText;

    /* START-USER-CTR-CODE */
    this.scene = scene;
    this.messages = []; // Initialize messages array
    this.maxMessages = 8; // Set to proper value
    this.messageDuration = 5000; // Set to proper value
    this.messageSpacing = 35; // Set to proper value
    this.messageY = -120; // Position relative to container center
    this.messageWidth = 300; // Set to proper value
    this.eventManager = EventManager.getInstance();
    this.messageX = -150; // Position relative to container center

    // Make sure this container stays on screen
    this.setScrollFactor(0);
    this.setDepth(100);

    // Subscribe to game events
    this.subscribeToEvents();

    // Get the game settings from the registry and set initial visibility
    const gameSettings = scene.registry.get('gameSettings');
    if (gameSettings && typeof gameSettings.showBattleLogs !== 'undefined') {
      this.showBattleLogs = gameSettings.showBattleLogs;

      // Apply visibility to all components
      this.titleText.setVisible(this.showBattleLogs);
      this.background.setVisible(this.showBattleLogs);

      // We haven't created any messages yet, so no need to update them
    } else {
      // Default to true if no settings are available
      this.showBattleLogs = true;
    }

    console.log('BattleLogPrefab initialized with visibility:', this.showBattleLogs);
    /* END-USER-CTR-CODE */
  }

  private background: Phaser.GameObjects.Rectangle;
  private titleText: Phaser.GameObjects.Text;
  public messages!: Phaser.GameObjects.Text[];
  public maxMessages: number = 0;
  public messageDuration: number = 0;
  public messageSpacing: number = 0;
  public messageY: number = 0;
  public messageX: number = 0;
  public messageWidth: number = 0;
  public eventManager!: EventManager;
  public showBattleLogs: boolean = false;

  /* START-USER-CODE */

  /**
   * Set the visibility of the message log
   * @param visible Whether the message log should be visible
   */
  setVisible(visible: boolean): this {
    console.log('setVisible', visible);

    this.showBattleLogs = visible;

    // Update visibility of background and title
    this.background.setVisible(visible);
    this.titleText.setVisible(visible);

    // Update visibility of all messages
    this.messages.forEach((message) => {
      message.setVisible(visible);
    });

    // Return this for method chaining
    return this;
  }

  /**
   * Subscribe to game events to log them
   */
  private subscribeToEvents(): void {
    // Player damage events
    this.eventManager.on(
      GameEvents.PLAYER_DAMAGED,
      (amount: number, health: number) => {
        this.addMessage(`You took ${amount} damage! Health: ${health}`, '#FF5555');
      },
      this
    );

    // Enemy defeated events
    this.eventManager.on(
      GameEvents.ENEMY_DEFEATED,
      (enemy: any) => {
        this.addMessage(`${enemy.enemyName || 'Enemy'} has been defeated!`, '#55FF55');
      },
      this
    );

    // Ability used events
    this.eventManager.on(
      GameEvents.ABILITY_USED,
      (abilityType: string, abilityName: string) => {
        this.addMessage(`Used ability: ${abilityName} (${abilityType})`, '#FFFF55');
      },
      this
    );

    // Game over events
    this.eventManager.on(
      GameEvents.GAME_OVER,
      (victory: boolean) => {
        const message = victory ? 'Victory!' : 'Defeat!';
        const color = victory ? '#00FF00' : '#FF0000';
        this.addMessage(message, color);
      },
      this
    );
  }

  /**
   * Add a new message to the log
   * @param message The message text
   * @param color Optional color for the message (default: white)
   */
  addMessage(message: string, color: string = '#FFFFFF'): void {
    // If battle logs are disabled, don't add new messages
    if (!this.showBattleLogs) return;

    // Determine position for new message
    const messageIndex = Math.min(this.messages.length, this.maxMessages - 1);
    const messageY = this.messageY + messageIndex * this.messageSpacing;

    // Create new message text object with position relative to container
    const textObject = this.scene.add.text(this.messageX, messageY, message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: color,
      align: 'left',
      stroke: '#000000',
      strokeThickness: 1,
      wordWrap: {
        width: this.messageWidth,
        useAdvancedWrap: true,
      },
    });

    // Add text object to this container
    this.add(textObject);

    // Add to messages array
    this.messages.push(textObject);

    // Apply a fade-in effect
    textObject.setAlpha(0);
    this.scene.tweens.add({
      targets: textObject,
      alpha: 1,
      duration: 200,
    });

    // Schedule message removal
    this.scene.time.delayedCall(this.messageDuration, () => {
      this.removeMessage(textObject);
    });

    // If we have too many messages, remove the oldest one immediately
    if (this.messages.length > this.maxMessages) {
      this.removeOldestMessage();
    } else {
      // Otherwise just reposition all messages
      this.repositionMessages();
    }

    // Ensure background size is fixed
    this.updateBackgroundHeight();
  }

  /**
   * Remove a message from the log
   * @param message The message text object to remove
   */
  private removeMessage(message: Phaser.GameObjects.Text): void {
    // Find message index
    const index = this.messages.indexOf(message);
    if (index === -1) return;

    // Fade out the message
    this.scene.tweens.add({
      targets: message,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        // Remove and destroy the message
        this.messages.splice(index, 1);
        this.remove(message, true); // Remove from container and destroy

        // Reposition remaining messages
        this.repositionMessages();

        // Update background height
        this.updateBackgroundHeight();
      },
    });
  }

  /**
   * Remove the oldest message immediately (when max messages is exceeded)
   */
  private removeOldestMessage(): void {
    if (this.messages.length === 0) return;

    const oldestMessage = this.messages[0];
    this.messages.shift(); // Remove from array
    this.remove(oldestMessage, true); // Remove from container and destroy

    // Reposition remaining messages immediately
    this.repositionMessages();
  }

  /**
   * Reposition messages after one is removed
   */
  private repositionMessages(): void {
    // Calculate visible messages based on container size
    const visibleMessages = Math.min(this.messages.length, this.maxMessages);

    this.messages.forEach((message, index) => {
      // Only show maxMessages at a time
      const isVisible = index < visibleMessages;
      message.setVisible(isVisible && this.showBattleLogs);

      if (isVisible) {
        // Animate message to new position relative to container
        this.scene.tweens.add({
          targets: message,
          y: this.messageY + index * this.messageSpacing,
          duration: 200,
        });
      }
    });
  }

  /**
   * Update background height based on number of messages
   */
  private updateBackgroundHeight(): void {
    // Don't modify the background dimensions - they are set by Phaser Editor
    // This method is now a no-op to prevent expansion
    // We're keeping it in case we need to add functionality later
  }

  /**
   * Clear all messages from the log
   */
  clearMessages(): void {
    this.messages.forEach((message) => {
      this.remove(message, true); // Remove from container and destroy
    });
    this.messages = [];
    this.updateBackgroundHeight();
  }

  /**
   * Update method to handle any per-frame logic
   */
  update(): void {
    // Update container position if window resizes
    const newX = this.scene.cameras.main.width - 160;
    if (Math.abs(this.x - newX) > 5) {
      this.setPosition(newX, 250);
    }
  }

  /**
   * Clean up method to remove event listeners
   */
  destroy(): void {
    this.eventManager.off(GameEvents.PLAYER_DAMAGED, undefined, this);
    this.eventManager.off(GameEvents.ENEMY_DEFEATED, undefined, this);
    this.eventManager.off(GameEvents.ABILITY_USED, undefined, this);
    this.eventManager.off(GameEvents.GAME_OVER, undefined, this);

    this.clearMessages();
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
