import * as Phaser from 'phaser';
import Champion from './Champion';
import EventManager, { GameEvents } from '../systems/EventManager';
import { ICharacterStats, IDamageable } from '../types';

export default class Enemy extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  private stats: ICharacterStats;
  private healthBar: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text | null = null;
  private _isDead: boolean = false;
  private lastMoveTime: number = 0;
  private moveCooldown: number = 5000; // Time between random movements in ms
  private markedForVoidRush: boolean = false;
  private voidRushMarkDuration: number = 0;
  private enemyName: string;
  private player: Champion | null = null;
  private attackTimer: number = 0;
  protected aggroRange: number = 300; // Range at which enemy notices player - changed to protected
  private isAggressive: boolean = true; // Whether enemy actively seeks player
  private attackCooldown: number = 2000; // ms between attacks
  private lastAttackTime: number = 0;
  private attackAnimationPlaying: boolean = false;
  private markedForRespawn: boolean = false;
  private damageTexts: Phaser.GameObjects.Text[] = [];
  private eventManager: EventManager;
  private _wasInAttackRange: boolean = false;
  private _wasInAggroRange: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, name: string = 'Minion', customStats?: ICharacterStats) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.eventManager = EventManager.getInstance();

    // Set physics properties
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 0.5);
    this.setScale(0.4);
    this.setBounce(0);
    this.setFriction(0, 0);

    // Set enemy name
    this.enemyName = name;

    // Set aggression behavior
    this.isAggressive = true;
    if (name === 'DarkLord') {
      this.aggroRange = 500; // DarkLord has larger detection range
      this.attackCooldown = 1500; // DarkLord attacks faster
      this.setScale(0.5); // Reduced from 0.8 to 0.5 for DarkLord
    }

    // Default enemy stats
    this.stats = customStats || {
      health: 250,
      maxHealth: 250,
      mana: 0,
      maxMana: 0,
      attackDamage: 25,
      attackSpeed: 0.8,
      attackRange: 70,
      moveSpeed: 80,
    };

    // Create health bar with higher depth to ensure visibility
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(5); // Ensure health bar is drawn above other elements
    this.updateHealthBar();

    // Create name display for special enemies
    // Small pack creatures stay unlabelled so their names don't stack into an unreadable pile.
    if (!['Minion', 'Shade Fledgling', 'Brute Shard'].includes(name)) {
      this.nameText = scene.add.text(x, y - 35, name, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      });
      this.nameText.setOrigin(0.5, 0.5);
      this.nameText.setDepth(6); // Set even higher depth for name text
    }

    // Random movement cooldown (different for each enemy)
    this.moveCooldown = Phaser.Math.Between(3000, 7000);

    // Set up events
    this.setInteractive();

    // Set up attack timer
    this.scene.time.addEvent({
      delay: 200, // Check more frequently - reduced from 500ms to 200ms
      callback: this.updateAggression,
      callbackScope: this,
      loop: true,
    });

    // Add a specific timer for both health bar and name text to ensure they always follow
    this.scene.time.addEvent({
      delay: 16, // Update every frame (approximately 60 fps)
      callback: this.updateUIElements,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Set the player target for this enemy
   */
  public setPlayer(player: Champion | null): void {
    this.player = player;
  }

  update() {
    if (this._isDead) {
      if (this.healthBar && this.healthBar.active) {
        // Keep updating health bar position even when dead
        this.updateHealthBar();
      }
      return;
    }

    // Update UI elements - always keep this at the top to ensure it's updated
    this.updateUIElements();

    // Update attack timer if it exists
    if (this.attackTimer > 0) {
      this.attackTimer -= this.scene.game.loop.delta;
      if (this.attackTimer <= 0) {
        this.attackTimer = 0;
      }
    }

    // If not attacking or chasing player, do random movement
    if (!this.attackAnimationPlaying && !this.isPlayerInAggroRange()) {
      const currentTime = this.scene.time.now;
      if (currentTime - this.lastMoveTime > this.moveCooldown) {
        this.moveRandomly();
        this.lastMoveTime = currentTime;
        this.moveCooldown = Phaser.Math.Between(3000, 7000);
      }
    }

    // Update shadow rush mark duration
    if (this.markedForVoidRush && this.voidRushMarkDuration > 0) {
      this.voidRushMarkDuration -= this.scene.game.loop.delta;
      if (this.voidRushMarkDuration <= 0) {
        this.markedForVoidRush = false;
        this.clearTint();
      }
    }

    // Update damage texts
    this.damageTexts.forEach((text) => {
      text.y -= 0.5; // Move them up slowly
    });
  }

  private isPlayerInAggroRange(): boolean {
    if (!this.player || !this.isAggressive) return false;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

    const inRange = distance <= this.aggroRange;

    // Only log when switching in/out of range to avoid console spam
    if (inRange && !this._wasInAggroRange) {
      // console.log(`${this.enemyName} detected player in AGGRO range! Distance: ${Math.round(distance)}, Aggro Range: ${this.aggroRange}`);
      this._wasInAggroRange = true;
    } else if (!inRange && this._wasInAggroRange) {
      // console.log(`${this.enemyName} lost player from AGGRO range. Distance: ${Math.round(distance)}`);
      this._wasInAggroRange = false;
    }

    return inRange;
  }

  private isPlayerInAttackRange(): boolean {
    if (!this.player) return false;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, this.player.x, this.player.y);

    const inRange = distance <= this.stats.attackRange;

    // Only log when switching in/out of range to avoid console spam
    if (inRange && !this._wasInAttackRange) {
      // console.log(`${this.enemyName} in ATTACK range! Distance: ${Math.round(distance)}, Attack Range: ${this.stats.attackRange}`);
      this._wasInAttackRange = true;
    } else if (!inRange && this._wasInAttackRange) {
      // console.log(`${this.enemyName} left ATTACK range. Distance: ${Math.round(distance)}`);
      this._wasInAttackRange = false;
    }

    return inRange;
  }

  private updateAggression = () => {
    if (this._isDead || !this.isAggressive || !this.player) return;

    // Check if player is in aggro range
    if (this.isPlayerInAggroRange()) {
      // If in attack range, attack player
      if (this.isPlayerInAttackRange()) {
        // Make sure we're not already attacking
        if (!this.attackAnimationPlaying) {
          // console.log(`${this.enemyName} attacking player!`);
          this.attackPlayer();
        }
      }
      // Otherwise, move toward player
      else {
        this.moveTowardPlayer();
      }
    } else {
      // Not in range, reset movement
      this.clearTint();
      // Stop chasing if player is out of range
      this.setVelocity(0, 0);
    }
  };

  private moveTowardPlayer() {
    if (!this.player || this.attackAnimationPlaying || this._isDead) return;

    // Calculate direction to player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.player.x, this.player.y);

    // Use direct velocity with a small acceleration factor for smoother motion
    const speedFactor = 1.0; // Full speed when chasing player
    const targetSpeedX = Math.cos(angle) * this.stats.moveSpeed * speedFactor;
    const targetSpeedY = Math.sin(angle) * this.stats.moveSpeed * speedFactor;

    // Current velocity
    const currentVelocityX = this.body!.velocity.x;
    const currentVelocityY = this.body!.velocity.y;

    // Use more direct movement (less smoothing) when chasing player
    const newVelocityX = currentVelocityX + (targetSpeedX - currentVelocityX) * 0.3;
    const newVelocityY = currentVelocityY + (targetSpeedY - currentVelocityY) * 0.3;

    this.setVelocity(newVelocityX, newVelocityY);

    // Visual indicator that enemy is chasing player
    this.setTint(0xffcc00); // Yellow tint when chasing
  }

  private attackPlayer() {
    if (this._isDead || !this.player) return;

    const currentTime = this.scene.time.now;

    // Check cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown || this.attackAnimationPlaying) {
      return;
    }

    // Set last attack time
    this.lastAttackTime = currentTime;
    this.attackAnimationPlaying = true;

    // Stop movement
    this.setVelocity(0, 0);

    // MUCH more aggressive visual effect - enemy flashes bright red and grows larger
    this.setTint(0xff0000);

    // console.log(`${this.enemyName} executing attack on player!`);

    // Create a quick attack animation and deal damage immediately
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.2,
      scaleY: this.scaleY * 1.2,
      duration: 100, // Very short duration for quick attacks
      yoyo: true,
      onComplete: () => {
        // Deal damage immediately
        if (this.player && !this._isDead && this.isPlayerInAttackRange()) {
          // Deal damage
          this.player.takeDamage(this.stats.attackDamage);
          // console.log(`${this.enemyName} dealt ${this.stats.attackDamage} damage to player!`);

          // Create hit effect
          this.createHitEffect();
        }

        // Clear attack state
        this.attackAnimationPlaying = false;
        if (!this.markedForVoidRush) {
          this.clearTint();
        }
      },
    });
  }

  private createHitEffect() {
    if (!this.player) return;

    // Create hit effect on player
    const hitEffect = this.scene.add.circle(this.player.x, this.player.y, 40, 0xff0000, 0.7);

    // Calculate better vertical position using displayHeight
    const verticalOffset = this.player.displayHeight * 0.7;

    // Add "DAMAGE" text
    const hitText = this.scene.add.text(this.player.x, this.player.y - verticalOffset, `-${this.stats.attackDamage}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FF0000',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    });
    hitText.setOrigin(0.5, 0.5);

    // Animate hit effect
    this.scene.tweens.add({
      targets: hitEffect,
      radius: 60,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        hitEffect.destroy();
      },
    });

    // Animate hit text
    this.scene.tweens.add({
      targets: hitText,
      y: hitText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        hitText.destroy();
      },
    });

    // Emit event for enemy attack
    this.eventManager.emit(GameEvents.ENEMY_ATTACK, {
      enemyName: this.enemyName,
      damage: this.stats.attackDamage,
    });
  }

  takeDamage(amount: number): void {
    if (this._isDead) return;

    // Apply damage
    this.stats.health -= amount;

    // Cap health at 0
    if (this.stats.health < 0) {
      this.stats.health = 0;
    }

    // Flash red to indicate damage
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (!this._isDead && !this.markedForVoidRush) {
        this.clearTint();
      } else if (this.markedForVoidRush) {
        this.setTint(0xa020f0); // Purple tint for shadow rush
      }
    });

    // Show damage text
    this.showDamageText(amount);

    // Update health bar
    this.updateHealthBar();

    // Check if dead
    if (this.stats.health <= 0 && !this._isDead) {
      this.handleDeath();
    }
  }

  private showDamageText(amount: number): void {
    // Calculate a better vertical position that takes scaling into account
    // Use displayHeight which accounts for the sprite's scale
    const verticalOffset = this.displayHeight * 0.7; // Position text above the enemy's head

    const damageText = this.scene.add.text(this.x, this.y - verticalOffset, amount.toString(), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    damageText.setOrigin(0.5, 0.5);
    this.damageTexts.push(damageText);

    // Animate the damage text floating up and fading
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        const index = this.damageTexts.indexOf(damageText);
        if (index > -1) {
          this.damageTexts.splice(index, 1);
        }
        damageText.destroy();
      },
    });
  }

  // Add die method that can be overridden by subclasses
  protected die(): void {
    this._isDead = true;
    this.setVelocity(0, 0);
    this.disableBody(true, false);
    this.setTint(0x555555);

    // Display death effect
    const deathEffect = this.scene.add.circle(this.x, this.y, 30, 0xffffff, 0.7);
    this.scene.tweens.add({
      targets: [deathEffect],
      alpha: 0,
      scale: 2,
      duration: 500,
      onComplete: () => {
        deathEffect.destroy();
      },
    });

    // Update UI elements one last time
    this.updateUIElements();

    // Remove name text if exists - fade it out
    if (this.nameText && this.nameText.active) {
      this.scene.tweens.add({
        targets: this.nameText,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          if (this.nameText) {
            this.nameText.destroy();
            this.nameText = null;
          }
        },
      });
    }

    // Begin fading out the health bar immediately
    if (this.healthBar && this.healthBar.active) {
      this.scene.tweens.add({
        targets: this.healthBar,
        alpha: 0,
        duration: 1000,
        onComplete: () => {
          if (this.healthBar) {
            this.healthBar.destroy();
          }
        },
      });
    }

    // Set a timer to remove the dead enemy corpse after a delay
    const corpseRemovalDelay = 2000; // 2 seconds before corpse starts fading
    this.scene.time.delayedCall(corpseRemovalDelay, () => {
      // Make the corpse fade out
      this.scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 1500, // 1.5 second fade out
        ease: 'Power2',
        onComplete: () => {
          // Remove from the scene but don't destroy completely
          // (allows respawn systems to still track the enemy)
          this.setVisible(false);
          this.setActive(false);
        },
      });
    });

    // Emit enemy defeated event
    this.eventManager.emit(GameEvents.ENEMY_DEFEATED, {
      enemyName: this.enemyName,
      position: { x: this.x, y: this.y },
    });
  }

  markForVoidRush(): void {
    this.markedForVoidRush = true;
    this.voidRushMarkDuration = 5000; // Mark lasts for 5 seconds
    this.setTint(0xa020f0); // Purple tint to indicate marked state
  }

  isMarkedForVoidRush(): boolean {
    return this.markedForVoidRush;
  }

  isDead(): boolean {
    return this._isDead;
  }

  getHealth(): number {
    return this.stats.health;
  }

  getMaxHealth(): number {
    return this.stats.maxHealth;
  }

  markForRespawn(): void {
    this.markedForRespawn = true;
  }

  isMarkedForRespawn(): boolean {
    return this.markedForRespawn;
  }

  private updateHealthBar(): void {
    if (!this.healthBar || !this.healthBar.active) return;

    this.healthBar.clear();

    const barWidth = 50;
    const barHeight = 6;

    // Position health bar to overlay on top of the enemy sprite
    // Using fixed position relative to the enemy center
    const x = this.x - barWidth / 2;
    const y = this.y - 25; // Fixed position relative to enemy center

    // Background
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health - use purple for DarkLord, red for others
    const healthColor = this.enemyName === 'DarkLord' ? 0x9932cc : 0xff0000;
    const healthPercent = this.stats.health / this.stats.maxHealth;
    this.healthBar.fillStyle(healthColor, 1);
    this.healthBar.fillRect(x + 1, y + 1, (barWidth - 2) * healthPercent, barHeight - 2);
  }

  private moveRandomly(): void {
    // Don't move if dead
    if (this._isDead) return;

    // Pick a random point nearby
    const randomAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const randomDistance = Phaser.Math.FloatBetween(50, 200);
    const targetX = this.x + Math.cos(randomAngle) * randomDistance;
    const targetY = this.y + Math.sin(randomAngle) * randomDistance;

    // Stay within world bounds
    const worldBounds = this.scene.physics.world.bounds;
    const boundedX = Phaser.Math.Clamp(targetX, worldBounds.x + 20, worldBounds.width - 20);
    const boundedY = Phaser.Math.Clamp(targetY, worldBounds.y + 20, worldBounds.height - 20);

    // Move towards the target point
    const moveAngle = Phaser.Math.Angle.Between(this.x, this.y, boundedX, boundedY);
    const speedX = Math.cos(moveAngle) * this.stats.moveSpeed;
    const speedY = Math.sin(moveAngle) * this.stats.moveSpeed;

    this.setVelocity(speedX, speedY);

    // Stop after reaching the destination
    this.scene.time.delayedCall(Phaser.Math.Between(800, 1500), () => {
      if (!this._isDead) {
        this.setVelocity(0, 0);
      }
    });
  }

  getName(): string {
    return this.enemyName;
  }

  // New getters and setters to support JungleMonster
  getStats(): ICharacterStats {
    return this.stats;
  }

  setMoveCooldown(cooldown: number): void {
    this.moveCooldown = cooldown;
  }

  getMoveCooldown(): number {
    return this.moveCooldown;
  }

  getPlayer(): Champion | null {
    return this.player;
  }

  isAttacking(): boolean {
    return this.attackAnimationPlaying;
  }

  setAggressive(aggressive: boolean): void {
    this.isAggressive = aggressive;
  }

  // Public method to trigger the death
  public handleDeath(): void {
    this.die();
  }

  // Add these protected methods to allow subclasses to access private properties
  protected setDeadState(isDead: boolean): void {
    this._isDead = isDead;
  }

  protected removeHealthBar(): void {
    if (this.healthBar) {
      this.healthBar.destroy();
    }
  }

  protected removeNameText(): void {
    if (this.nameText) {
      this.nameText.destroy();
      this.nameText = null;
    }
  }

  protected updateHealthBarDisplay(): void {
    this.updateHealthBar();
  }

  // New method to update all UI elements
  private updateUIElements(): void {
    this.updateHealthBar();
    this.updateNameText();
  }

  // New method to update name text position
  private updateNameText(): void {
    if (this.nameText && this.nameText.active) {
      this.nameText.setPosition(this.x, this.y - 35);
    }
  }
}
