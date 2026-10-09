import * as Phaser from 'phaser';
import Enemy from './Enemy';
import Champion from './Champion';
import EventManager, { GameEvents } from '../systems/EventManager';
import { ICharacterStats, JungleMonsterType } from '../types';
import Game from '../scenes/Game';

export default class JungleMonster extends Enemy {
  private campId: string;
  private monsterType: JungleMonsterType;
  private homePosition: { x: number; y: number };
  private isReturningHome: boolean = false;
  private alertGraphic: Phaser.GameObjects.Graphics | null = null;
  private alertText: Phaser.GameObjects.Text | null = null;
  private isAlertShowing: boolean = false;
  private alertTween: Phaser.Tweens.Tween | null = null;
  private aggroCheckTimer: Phaser.Time.TimerEvent | null = null;
  private hasBeenAggressive: boolean = false; // Track if monster has ever been aggressive
  private parentBrute: JungleMonster | null = null;
  private initialPosition: Phaser.Math.Vector2;
  private leashRange: number = 500; // Distance before monster returns home
  private originalLeashRange: number = 500;
  private engagementTimer: Phaser.Time.TimerEvent | null = null;

  constructor(
    scene: Game,
    x: number,
    y: number,
    texture: string,
    monsterType: JungleMonsterType,
    customStats?: ICharacterStats,
    parentBrute: JungleMonster | null = null,
    campId: string = 'camp1',
    type: JungleMonsterType = JungleMonsterType.EMBER_WARDEN,
  ) {
    // Create default jungle monster stats if not provided
    const defaultStats: ICharacterStats = {
      health: 250,
      maxHealth: 250,
      mana: 0,
      maxMana: 0,
      attackDamage: 20,
      moveSpeed: 50,
      attackSpeed: 1,
      attackRange: 100,
    };

    const stats = customStats || defaultStats;

    // Call parent constructor
    super(scene, x, y, texture, JungleMonster.displayName(monsterType));
    this.monsterType = monsterType;
    this.parentBrute = parentBrute;
    this.campId = campId;
    this.homePosition = { x, y };

    // Set scale based on monster type
    const scaleFactor = 0.15; // creature sprites are 512x512
    switch (monsterType) {
      case JungleMonsterType.EMBER_WARDEN:
        this.setScale(1.4 * scaleFactor);
        this.setAggroRange(250); // Larger aggro range for ember warden
        break;
      case JungleMonsterType.RAPTOR:
        this.setScale(1.1 * scaleFactor);
        this.setAggroRange(200);
        break;
      case JungleMonsterType.BRUTE:
        // Check if this is the large brute (we'll set this property in JungleCampManager)
        if ((this as any).isLargeBrute) {
          this.setScale(1.6 * scaleFactor); // Make the large brute bigger
          this.setAggroRange(220);
        } else {
          this.setScale(1.3 * scaleFactor);
          this.setAggroRange(200);
        }
        break;
      case JungleMonsterType.SHARD_BRUTE:
        this.setScale(0. * scaleFactor); // Reduced from 0.3 to 0.1 to make them much smaller
        this.setAggroRange(220); // Mini brutes are more aggressive
        break;
      default:
        this.setScale(scaleFactor);
        break;
    }

    // Set up aggro check timer
    this.aggroCheckTimer = this.scene.time.addEvent({
      delay: 500,
      callback: this.checkPlayerProximity,
      callbackScope: this,
      loop: true,
    });

    // Start as aggressive by default
    this.setAggressive(true);

    // Reduce random movement range for jungle monsters (they should mostly stay at their camp)
    this.setMoveCooldown(8000); // Longer time between random movements

    // Store initial position as home position
    this.initialPosition = new Phaser.Math.Vector2(x, y);
  }

  // Check if player is close enough to aggro
  private checkPlayerProximity() {
    const gameScene = this.scene as Game;
    const player = gameScene.getPlayer();
    if (!player || this.isDead() || this.isReturningHome) return;

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      player.x,
      player.y,
    );

    // If monster is within aggro range of player
    if (distance < this.aggroRange) {
      if (!this.hasBeenAggressive) {
        this.showAggroAlert();
        // console.log(`${this.monsterType} detected player in range! Distance: ${Math.round(distance)}`);
      }
      
      // Always set to aggressive when player is in range
      this.hasBeenAggressive = true;
      this.setAggressive(true);
      
      // Increase leash range when chasing player
      this.setLeashRadius(this.originalLeashRange * 2);
      
      // Reset the engagement timer each time player is in range
      this.resetEngagementTimer();
      
      // Force update player targeting - ensure the monster has the current player reference
      this.setPlayer(player);
      super.setPlayer(player);
    } else if (this.hasBeenAggressive && distance >= this.aggroRange) {
      // Player moved out of aggro range, start return timer
      // console.log(`${this.monsterType} lost sight of player! Distance: ${Math.round(distance)}`);
      this.startReturnToHomeTimer();
    }
  }

  private resetEngagementTimer() {
    // Clear any existing timer
    if (this.engagementTimer) {
      this.engagementTimer.remove(false);
    }
    
    // Reset the timer - this keeps the monster engaged while player is in range
    this.engagementTimer = this.scene.time.addEvent({
      delay: 5000, // 5 seconds of combat before checking distance again
      callback: () => {
        // After timer expires, check if player is still in range
        const player = (this.scene as Game).getPlayer();
        if (player) {
          const currentDistance = Phaser.Math.Distance.Between(
            this.x, 
            this.y, 
            player.x, 
            player.y
          );
          
          // If player has moved too far away, return home
          if (currentDistance > this.aggroRange * 1.5) {
            // console.log(`${this.monsterType} disengaging, player too far away`);
            this.returnToHome();
          } else {
            // Player still nearby, reset timer
            this.resetEngagementTimer();
          }
        }
      },
      callbackScope: this,
    });
  }

  private startReturnToHomeTimer() {
    // Clear any existing timer
    if (this.engagementTimer) {
      this.engagementTimer.remove(false);
    }
    
    // Set a timer before returning home
    this.engagementTimer = this.scene.time.addEvent({
      delay: 2000, // 2 seconds before returning home
      callback: () => {
        const player = (this.scene as Game).getPlayer();
        if (player) {
          const currentDistance = Phaser.Math.Distance.Between(
            this.x, 
            this.y, 
            player.x, 
            player.y
          );
          
          // Check if player has come back into range
          if (currentDistance < this.aggroRange) {
            // Player came back, resume chasing
            // console.log(`${this.monsterType} detected player again!`);
            this.resetEngagementTimer();
          } else {
            // Player still out of range, return home
            // console.log(`${this.monsterType} returning to base`);
            this.returnToHome();
          }
        } else {
          // No player, return home
          this.returnToHome();
        }
      },
      callbackScope: this,
    });
  }

  // Show an alert when monster becomes aggressive
  private showAggroAlert() {
    // Create an exclamation mark or alert effect above the monster
    const alertText = this.scene.add.text(
      this.x,
      this.y - this.height / 2 - 30,
      '!',
      {
        fontFamily: 'Arial',
        fontSize: '32px',
        color: '#FF0000',
        stroke: '#000000',
        strokeThickness: 4,
      },
    );
    alertText.setOrigin(0.5, 0.5);

    // Animate the alert
    this.scene.tweens.add({
      targets: alertText,
      y: alertText.y - 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        alertText.destroy();
      },
    });

    // Flash the monster red briefly
    this.setTint(0xff0000);
    this.scene.time.delayedCall(200, () => {
      this.clearTint();
    });
  }

  // Override update method to add leashing behavior
  update() {
    super.update();

    if (this.isDead()) {
      return;
    }

    // Check if monster is too far from home position
    const distanceFromHome = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.homePosition.x,
      this.homePosition.y,
    );

    // If too far from home and not already returning, start return sequence
    if (distanceFromHome > this.leashRange && !this.isReturningHome) {
      // console.log(`${this.monsterType} exceeded leash range (${this.leashRange}), distance: ${distanceFromHome}`);
      this.returnToHome();
      return; // Stop further processing
    }
    
    // If currently returning home, ensure we don't do other behaviors
    if (this.isReturningHome) {
      // Check if we've reached home yet
      if (distanceFromHome < 50) {
        // We've reached home, reset state
        this.setVelocity(0, 0);
        this.setPosition(this.homePosition.x, this.homePosition.y);
        this.clearTint();
        this.isReturningHome = false;
        this.hasBeenAggressive = false;
        this.setLeashRadius(this.originalLeashRange);
        this.setAggressive(false);
        // console.log(`${this.monsterType} reached home position, resetting state`);
      }
      return; // Don't do other behaviors while returning
    }
    
    // If we're here, we're not dead, not leashing, and not returning home
    // Check if player is in range
    const gameScene = this.scene as Game;
    const player = gameScene.getPlayer();
    if (player) {
      const distanceToPlayer = Phaser.Math.Distance.Between(
        this.x, 
        this.y, 
        player.x, 
        player.y
      );
      
      if (distanceToPlayer <= this.aggroRange && !this.hasBeenAggressive) {
        // Just entered aggro range, become aggressive
        // console.log(`${this.monsterType} becoming aggressive - player in range!`);
        this.hasBeenAggressive = true;
        this.setAggressive(true);
        this.showAggroAlert();
      }
    }
  }

  // Improved method to return monster to home position
  returnToHome() {
    // Reset aggression state
    this.setAggressive(false);
    this.isReturningHome = true;
    
    // console.log(`${this.monsterType} returning to home position: ${this.homePosition.x}, ${this.homePosition.y}`);

    // Move back to home position with increased speed
    const homeAngle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.homePosition.x,
      this.homePosition.y,
    );

    const moveSpeed = this.getStats().moveSpeed * 2.0; // Move faster when returning home (increased from 1.5 to 2.0)
    const speedX = Math.cos(homeAngle) * moveSpeed;
    const speedY = Math.sin(homeAngle) * moveSpeed;

    this.setVelocity(speedX, speedY);
    
    // Visual indication
    this.setTint(0x0000ff); // Blue tint when returning home
    
    // We'll check if we've reached home in the update method instead of using a timer
    // This simplifies the logic and avoids potential issues with timer cleanup
  }

  // Override die method to spawn mini brutes if needed
  protected die(): void {
    // Cleanup the aggro check timer
    if (this.aggroCheckTimer) {
      this.aggroCheckTimer.destroy();
    }

    // Handle specific behavior for brutes
    if (this.monsterType === JungleMonsterType.BRUTE) {
      // Mark as dead for gameplay purposes but don't start visual fadeout yet
      this.setDeadState(true);
      this.setVelocity(0, 0);
      this.disableBody(true, false);
      this.setTint(0x888888); // Slightly lighter gray than normal death

      // Update health bar and remove name
      this.updateHealthBarDisplay();
      this.removeNameText();

      // Remove health bar after a delay
      this.scene.time.delayedCall(2000, () => {
        this.removeHealthBar();
      });

      // Spawn mini brutes
      this.spawnShardBrutes();

      // Notify jungle camp manager of monster death
      const gameScene = this.scene as Game;
      const eventManager = EventManager.getInstance();
      eventManager.emit(GameEvents.ENEMY_DEFEATED, {
        monster: this,
        campId: this.campId,
        type: this.monsterType,
      });

      // Create a crumbling effect
      this.createCrumblingEffect();

      // Delay the parent die() call for visual effect (wait for mini brutes to spawn)
      this.scene.time.delayedCall(800, () => {
        // Call parent die method for visual fadeout
        // We'll use the Enemy class's corpse removal, but skip the initial death effects
        this.startCorpseRemoval();
      });
    } else {
      // For non-brute monsters, use standard death behavior
      // Notify jungle camp manager of monster death
      const gameScene = this.scene as Game;
      const eventManager = EventManager.getInstance();
      eventManager.emit(GameEvents.ENEMY_DEFEATED, {
        monster: this,
        campId: this.campId,
        type: this.monsterType,
      });

      // Call parent die method which includes corpse removal
      super.die();
    }
  }

  // Create a visual crumbling effect as the brute breaks into pieces
  private createCrumblingEffect(): void {
    // Add a slight "breaking apart" motion before fading out
    this.scene.tweens.add({
      targets: this,
      scaleX: '*=1.15', // Expand slightly
      scaleY: '*=0.85', // Flatten a bit
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
    });

    // Create particles that look like pieces of the brute breaking apart
    const colors = [0x8b4513, 0x8b5a2b, 0xa0522d]; // Brown colors for rock/stone

    // Create multiple particle emitters for a more dramatic effect
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3; // Divide circle into 3 parts
      const offsetX = Math.cos(angle) * 20;
      const offsetY = Math.sin(angle) * 20;

      const particles = this.scene.add.particles(
        this.x + offsetX,
        this.y + offsetY,
        'particle',
        {
          speed: { min: 50, max: 150 },
          scale: { start: 0.5, end: 0 },
          tint: [colors[i % colors.length]],
          lifespan: { min: 800, max: 1200 },
          quantity: 8,
          blendMode: 'ADD',
          emitting: false,
        },
      );

      // Emit a burst of particles
      particles.explode(15);

      // Auto-destroy the particles
      this.scene.time.delayedCall(1500, () => {
        particles.destroy();
      });
    }

    // Add a shock wave effect
    const shockWave = this.scene.add.circle(this.x, this.y, 10, 0xffffff, 0.7);
    this.scene.tweens.add({
      targets: shockWave,
      radius: 60,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => {
        shockWave.destroy();
      },
    });

    // Add a quick flash effect
    const flash = this.scene.add.circle(this.x, this.y, 40, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  // Start the corpse removal process (called after mini brutes spawn)
  private startCorpseRemoval(): void {
    // Set a timer to remove the dead enemy corpse
    const corpseRemovalDelay = 500; // Shorter delay since we already waited
    this.scene.time.delayedCall(corpseRemovalDelay, () => {
      // Make the corpse fade out
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 1000, // 1 second fade out
        ease: 'Power2',
        onComplete: () => {
          // Remove from the scene but don't destroy completely
          // (allows respawn systems to still track the enemy)
          this.setVisible(false);
          this.setActive(false);
        },
      });
    });
  }

  // Method to spawn mini brutes when a main brute dies
  private spawnShardBrutes() {
    // Only spawn mini brutes if this is a main brute (not already a mini brute)
    if (this.monsterType !== JungleMonsterType.BRUTE) return;

    const gameScene = this.scene as Game;

    // Determine how many mini brutes to spawn based on brute size
    const isLargeBrute = (this as any).isLargeBrute;
    const numShardBrutes = isLargeBrute ? 4 : 2;

    // Track created mini brutes for animations
    const shardBrutes: JungleMonster[] = [];

    // Spawn mini brutes around the original brute position
    for (let i = 0; i < numShardBrutes; i++) {
      // Create positions in a circle around the original brute
      const angle = (i / numShardBrutes) * Math.PI * 2; // Evenly distribute in a circle
      const finalDistance = 40 + Math.random() * 20;

      // Start at parent position and animate outward
      const startX = this.x;
      const startY = this.y;
      const finalX = this.x + Math.cos(angle) * finalDistance;
      const finalY = this.y + Math.sin(angle) * finalDistance;

      // Create mini brute
      const shardBrute = new JungleMonster(
        gameScene,
        startX, // Start at parent position
        startY, // Start at parent position
        'enemy-brute-shard',
        JungleMonsterType.SHARD_BRUTE,
        {
          // Custom stats for mini brutes - make them fast but weaker
          health: 80,
          maxHealth: 80,
          attackDamage: 10,
          moveSpeed: 100, // Faster movement
          attackRange: 60,
          attackSpeed: 1.5, // Faster attacks
          mana: 0,
          maxMana: 0,
        },
        this, // Set this brute as the parent
        this.campId,
        JungleMonsterType.SHARD_BRUTE,
      );

      // Set the player reference and make aggressive immediately
      const player = gameScene.getPlayer();
      if (player) {
        shardBrute.setPlayer(player);
        // Make mini brutes aggressive immediately 
        shardBrute.setAggressive(true);
        shardBrute.hasBeenAggressive = true;
      }

      // Initially make it small and hidden inside the parent
      shardBrute.setScale(0.02);
      shardBrute.setAlpha(0.7);

      // Add to scene's enemies array
      const enemies = gameScene.getEnemies();
      if (enemies) {
        enemies.push(shardBrute);
      }

      // Add to our local array for animations
      shardBrutes.push(shardBrute);

      // Animate the mini brute breaking away from the parent
      this.scene.tweens.add({
        targets: shardBrute,
        x: finalX,
        y: finalY,
        scale: 0.01, // Reduced from 0.3 to 0.01 for much smaller mini brutes
        alpha: 1,
        duration: 400,
        delay: i * 100, // Stagger the animations
        ease: 'Back.easeOut',
        onComplete: () => {
          // Add a little bounce when they land
          this.scene.tweens.add({
            targets: shardBrute,
            y: finalY - 10,
            duration: 150,
            yoyo: true,
            ease: 'Sine.easeOut',
          });
        },
      });
    }
  }

  // Human-readable name shown above the monster and in the battle log
  static displayName(type: JungleMonsterType): string {
    switch (type) {
      case JungleMonsterType.EMBER_WARDEN: return 'Ember Warden';
      case JungleMonsterType.RAPTOR: return 'Shade Raptor';
      case JungleMonsterType.SMALL_RAPTOR: return 'Shade Fledgling';
      case JungleMonsterType.BRUTE: return 'Stone Brute';
      case JungleMonsterType.SHARD_BRUTE: return 'Brute Shard';
      default: return 'Monster';
    }
  }

  // Getter for monster type
  getMonsterType(): JungleMonsterType {
    return this.monsterType;
  }

  // Setter for home position
  setHomePosition(x: number, y: number) {
    this.homePosition.x = x;
    this.homePosition.y = y;
  }

  // Getter for home position
  getHomePosition(): { x: number; y: number } {
    return this.homePosition;
  }

  // Add a method to set the aggro range
  protected setAggroRange(range: number) {
    // Access the protected property from the parent class
    this.aggroRange = range;
  }

  // Add a setter method for aggression
  public setAggressive(value: boolean) {
    // Call the parent class method to set the isAggressive flag
    super.setAggressive(value);
    
    if (value) {
      // Begin tracking player
      this.hasBeenAggressive = true;
    } else {
      // Preparing to return home
      this.isReturningHome = true;
    }
    
    // console.log(`${this.monsterType} aggression set to: ${value}`);
  }

  public setLeashRadius(radius: number) {
    this.leashRange = radius;
  }

  /**
   * Set the player target for this monster
   */
  public setPlayer(player: Champion | null): void {
    // Call the parent method to ensure the player reference is properly set
    super.setPlayer(player);
    
    if (player) {
      // console.log(`${this.monsterType} targeting player at (${Math.round(player.x)}, ${Math.round(player.y)})`);
    }
  }
}
