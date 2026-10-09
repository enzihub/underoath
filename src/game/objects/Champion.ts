import * as Phaser from 'phaser';
import Enemy from './Enemy';
import EventManager, { GameEvents } from '../systems/EventManager';
import { AbilityType, IAbility, ICharacterStats, IDamageable } from '../types';

export default class Champion extends Phaser.Physics.Arcade.Sprite implements IDamageable {
  private stats: ICharacterStats;
  private targetEnemy: Enemy | null = null;
  private moveTarget: { x: number; y: number } | null = null;
  private attackTimer: number = 0;
  private abilities: Record<AbilityType, IAbility>;
  private abilityCooldowns: Record<AbilityType, number> = {
    Q: 0,
    W: 0,
    E: 0,
    R: 0,
  };
  private abilityInvocationAttempts: Record<AbilityType, number> = {
    Q: 0,
    W: 0,
    E: 0,
    R: 0,
  };
  private abilityEffects: Record<AbilityType, Phaser.GameObjects.Image | null> = { Q: null, W: null, E: null, R: null };
  private healthBar: Phaser.GameObjects.Graphics;
  private isDashing: boolean = false;
  private isAttacking: boolean = false;
  private autoAttackEnabled: boolean = true;
  private killCount: number = 0;
  private nearbyEnemies: Enemy[] = [];
  private lastAbilityUsedTime: number = 0;
  private lastWaypointPosition: { x: number; y: number } | null = null;
  private lastWaypointClickTime: number = 0;
  private cameraFollowTimer: Phaser.Time.TimerEvent | null = null;

  private eventManager: EventManager;

  // Track if an ability is currently in use (being executed)
  private abilityInUse: Record<AbilityType, boolean> = {
    Q: false,
    W: false,
    E: false,
    R: false,
  };

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, customSpeed?: number) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.eventManager = EventManager.getInstance();

    // Set physics properties
    this.setCollideWorldBounds(true);
    this.setOrigin(0.5, 0.5);
    this.setScale(0.5);
    this.setBounce(0);
    this.setFriction(0, 0);

    // Soft violet outline so the dark armour reads against the forest (WebGL only).
    if (this.preFX) {
      this.preFX.setPadding(24);
      this.preFX.addGlow(0xc4b5ff, 5, 0, false, 0.1, 16);
    }

    // Default stats for Hero
    this.stats = {
      health: 700,
      maxHealth: 700,
      mana: 500,
      maxMana: 500,
      attackDamage: 65,
      attackSpeed: 1.5,
      attackRange: 150,
      moveSpeed: customSpeed || 350,
    };

    // Hero's abilities with reduced cooldowns
    this.abilities = {
      Q: {
        key: 'Q',
        name: 'Shadow Strike',
        cooldown: 0.1,
        manaCost: 40,
        damage: 100,
        range: 650,
        description: 'Unleash a bolt of dark energy in an arc.',
        effectKey: 'q-effect',
      },
      W: {
        key: 'W',
        name: 'Protective Aura',
        cooldown: 0.1,
        manaCost: 30,
        damage: 40,
        range: 250,
        description: 'Summon three orbiting spheres that detonate on contact with enemies.',
        duration: 5,
        effectKey: 'w-effect',
      },
      E: {
        key: 'E',
        name: 'Void Rush',
        cooldown: 0.1,
        manaCost: 40,
        damage: 70,
        range: 450,
        description: 'Dash to an enemy, dealing damage.',
        effectKey: 'e-effect',
      },
      R: {
        key: 'R',
        name: 'Darkfall',
        cooldown: 0.1,
        manaCost: 70,
        damage: 250,
        range: 550,
        description: 'Pull in all nearby enemies and damage them.',
        aoe: true,
        effectKey: 'r-effect',
      },
    };

    // Create health bar above champion
    this.healthBar = scene.add.graphics();
    this.healthBar.setDepth(5); // Ensure health bar is drawn above other elements
    this.updateHealthBar();

    // Add mana regeneration over time
    this.scene.time.addEvent({
      delay: 1000,
      callback: this.regenerateMana,
      callbackScope: this,
      loop: true,
    });

    // Check for nearby enemies periodically
    this.scene.time.addEvent({
      delay: 500,
      callback: this.scanForEnemies,
      callbackScope: this,
      loop: true,
    });
  }

  private scanForEnemies() {
    // Find all enemies in the scene
    const allEnemies = this.scene.children.getChildren().filter((obj) => obj instanceof Enemy) as Enemy[];

    this.nearbyEnemies = [];

    // Check which enemies are in auto-attack range
    allEnemies.forEach((enemy) => {
      if (!enemy.isDead()) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

        if (distance <= this.stats.attackRange * 1.2) {
          // Slightly larger scan range
          this.nearbyEnemies.push(enemy);
        }
      }
    });
  }

  private regenerateMana(): void {
    if (this.stats.mana < this.stats.maxMana) {
      this.stats.mana = Math.min(this.stats.mana + 15, this.stats.maxMana);
    }
  }

  update() {
    // Update cooldowns
    Object.keys(this.abilityCooldowns).forEach((key) => {
      const abilityKey = key as AbilityType;
      if (this.abilityCooldowns[abilityKey] > 0) {
        this.abilityCooldowns[abilityKey] -= this.scene.game.loop.delta / 1000;
        if (this.abilityCooldowns[abilityKey] < 0) {
          this.abilityCooldowns[abilityKey] = 0;
        }
      }
    });

    // Update attack timer
    if (this.attackTimer > 0) {
      this.attackTimer -= this.scene.game.loop.delta / 1000;
    }

    // Don't process movement while dashing
    if (this.isDashing) {
      // Even when dashing, make sure health bar follows
      this.updateHealthBar();
      return;
    }

    // Handle movement to target
    if (this.moveTarget) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);

      if (distance > 5) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);

        const speedX = Math.cos(angle) * this.stats.moveSpeed;
        const speedY = Math.sin(angle) * this.stats.moveSpeed;

        this.setVelocity(speedX, speedY);

        // Simple animation effect - adjust sprite alpha based on movement
        this.setAlpha(0.8 + Math.sin(this.scene.time.now / 200) * 0.2);
      } else {
        this.setVelocity(0, 0);
        this.moveTarget = null;
        this.setAlpha(1);
      }
    } else {
      this.setVelocity(0, 0);
    }

    // Auto attack target if in range and attack timer is ready
    if (
      (this.targetEnemy && !this.targetEnemy.isDead() && this.attackTimer <= 0 && !this.isAttacking) ||
      (this.autoAttackEnabled && this.nearbyEnemies.length > 0 && this.attackTimer <= 0 && !this.isAttacking && !this.targetEnemy)
    ) {
      // If we have a specific target, attack it
      if (this.targetEnemy && !this.targetEnemy.isDead()) {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

        if (distance <= this.stats.attackRange) {
          this.performAttack();
        }
      }
      // Otherwise, if auto-attack is on, attack the closest enemy
      else if (this.autoAttackEnabled && this.nearbyEnemies.length > 0) {
        // Find closest enemy
        let closestEnemy = this.nearbyEnemies[0];
        let closestDistance = Phaser.Math.Distance.Between(this.x, this.y, closestEnemy.x, closestEnemy.y);

        this.nearbyEnemies.forEach((enemy) => {
          const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestEnemy = enemy;
          }
        });

        // Set as target and attack
        this.targetEnemy = closestEnemy;
        this.performAttack();
      }
    }

    // Always update health bar at the end of each frame
    this.updateHealthBar();
  }

  moveTo(x: number, y: number) {
    this.moveTarget = { x, y };

    // Calculate distance
    const distance = Phaser.Math.Distance.Between(this.x, this.y, x, y);

    // Create a visual waypoint indicator
    this.createWaypoint(x, y);

    // Record the time of this waypoint click
    this.lastWaypointClickTime = this.scene.time.now;

    // Cancel any existing camera follow timer
    if (this.cameraFollowTimer) {
      this.cameraFollowTimer.remove();
    }

    // Set a new timer to follow the player after 2 seconds
    this.cameraFollowTimer = this.scene.time.delayedCall(2000, () => {
      // Use a camera tween for smooth transition back to player
      const mainCamera = this.scene.cameras.main;

      // First stop following anything the camera might be following
      mainCamera.stopFollow();

      // Get current camera center position
      const startX = mainCamera.midPoint.x;
      const startY = mainCamera.midPoint.y;

      // Create a dummy object to tween from current camera position to player position
      const dummyObject = { x: startX, y: startY };

      // Tween the dummy object over 500ms (half a second) for smooth motion
      this.scene.tweens.add({
        targets: dummyObject,
        x: this.x,
        y: this.y,
        duration: 500,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          // Update camera scroll position during the tween
          mainCamera.centerOn(dummyObject.x, dummyObject.y);
        },
        onComplete: () => {
          // Once the camera has smoothly moved to the player, start following
          mainCamera.startFollow(this);
        },
      });
    });

    // Notify the game scene about movement
    this.scene.events.emit('playerMove', {
      distance: Math.floor(distance),
      speed: this.stats.moveSpeed,
      x: Math.floor(x),
      y: Math.floor(y),
    });

    // Clear target when moving
    this.clearTarget();
  }

  /**
   * Creates a visual waypoint at the target location
   */
  private createWaypoint(x: number, y: number) {
    // Create the circle for the waypoint
    const waypointCircle = this.scene.add.circle(x, y, 15, 0x00ff00, 0.7);

    // Create a pulsing inner circle
    const innerCircle = this.scene.add.circle(x, y, 5, 0xffffff, 0.9);

    // Add click animation
    const clickAnimation = this.scene.add.circle(x, y, 30, 0x00ff00, 0.3);
    this.scene.tweens.add({
      targets: clickAnimation,
      alpha: 0,
      scale: 2.0,
      duration: 500,
      onComplete: () => {
        clickAnimation.destroy();
      },
    });

    // Add directional arrow line from previous point to this waypoint
    const line = this.scene.add.graphics();
    line.lineStyle(2, 0x00ff00, 0.6);

    // If this is the first waypoint, connect from player to waypoint
    // Otherwise, connect from the previous waypoint to the current one
    const startX = this.lastWaypointPosition ? this.lastWaypointPosition.x : this.x;
    const startY = this.lastWaypointPosition ? this.lastWaypointPosition.y : this.y;

    line.lineBetween(startX, startY, x, y);

    // Update last waypoint position
    this.lastWaypointPosition = { x, y };

    // Fade out and destroy the waypoint after a delay
    this.scene.tweens.add({
      targets: [waypointCircle, innerCircle],
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        waypointCircle.destroy();
        innerCircle.destroy();

        // Clear the last waypoint position if this waypoint is the current destination and has faded
        if (
          this.moveTarget &&
          this.moveTarget.x === x &&
          this.moveTarget.y === y &&
          (!this.lastWaypointPosition || (this.lastWaypointPosition.x === x && this.lastWaypointPosition.y === y))
        ) {
          this.lastWaypointPosition = null;
        }
      },
    });

    // Fade out the line more quickly
    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 800,
      onComplete: () => {
        line.destroy();
      },
    });
  }

  setTarget(enemy: Enemy) {
    this.targetEnemy = enemy;
  }

  clearTarget() {
    this.targetEnemy = null;
  }

  hasTarget(): boolean {
    return this.targetEnemy !== null && !this.targetEnemy.isDead();
  }

  toggleAutoAttack() {
    this.autoAttackEnabled = !this.autoAttackEnabled;
    return this.autoAttackEnabled;
  }

  attack() {
    if (this.targetEnemy && !this.isDashing) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

      if (distance > this.stats.attackRange) {
        // Move to attack range
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

        const moveToX = this.targetEnemy.x - Math.cos(angle) * (this.stats.attackRange * 0.9);
        const moveToY = this.targetEnemy.y - Math.sin(angle) * (this.stats.attackRange * 0.9);

        this.moveTo(moveToX, moveToY);
      } else {
        this.performAttack();
      }
    }
  }

  private performAttack() {
    if (!this.targetEnemy || this.isAttacking) return;

    this.isAttacking = true;

    // Stop movement
    this.moveTarget = null;
    this.setVelocity(0, 0);

    // Create attack animation with more vibrant color and thicker lines
    const line = this.scene.add.graphics();
    line.lineStyle(8, 0xffdd00, 1); // Slightly reduced thickness from 10 to 8
    line.lineBetween(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

    // Add arrow at the end for direction visibility but smaller than before
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);
    const arrowSize = 15; // Reduced from 25 back to original size
    const arrowX = this.targetEnemy.x - Math.cos(angle) * 20;
    const arrowY = this.targetEnemy.y - Math.sin(angle) * 20;

    // Draw arrow head
    line.fillStyle(0xffdd00, 1);
    line.fillTriangle(
      arrowX,
      arrowY,
      arrowX - Math.cos(angle - Math.PI / 6) * arrowSize,
      arrowY - Math.sin(angle - Math.PI / 6) * arrowSize,
      arrowX - Math.cos(angle + Math.PI / 6) * arrowSize,
      arrowY - Math.sin(angle + Math.PI / 6) * arrowSize
    );

    // Add more visible text label for the attack
    const attackLabel = this.scene.add.text(
      this.x + (this.targetEnemy.x - this.x) * 0.5,
      this.y + (this.targetEnemy.y - this.y) * 0.5 - 20,
      'ATTACK',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    attackLabel.setOrigin(0.5, 0.5);

    // Add bigger, more noticeable flash effect at player position
    const flash = this.scene.add.circle(this.x, this.y, 40, 0xffdd00, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.0,
      duration: 250,
      onComplete: () => {
        flash.destroy();
      },
    });

    // Pulsing effect along the attack line
    const pulseCircle = this.scene.add.circle(this.x, this.y, 15, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: pulseCircle,
      x: this.targetEnemy.x,
      y: this.targetEnemy.y,
      duration: 150,
      onComplete: () => {
        pulseCircle.destroy();
      },
    });

    // Deal damage after a short delay
    this.scene.time.delayedCall(150, () => {
      if (this.targetEnemy) {
        // Calculate attack distance
        const attackDistance = Phaser.Math.Distance.Between(this.x, this.y, this.targetEnemy.x, this.targetEnemy.y);

        // Apply damage
        const actualDamage = Math.floor(this.stats.attackDamage);
        this.targetEnemy.takeDamage(actualDamage);

        // Notify the game scene about the attack
        this.scene.events.emit('playerAttack', {
          targetName: this.targetEnemy.constructor.name,
          damage: actualDamage,
          distance: Math.floor(attackDistance),
        });

        // Create enhanced hit effect - bigger and more noticeable
        const hitEffect = this.scene.add.circle(
          this.targetEnemy.x,
          this.targetEnemy.y,
          50, // Increased from 30 to 50
          0xffdd00,
          0.9 // Increased opacity from 0.8 to 0.9
        );

        // Add impact lines radiating outward from hit point
        const impactGraphics = this.scene.add.graphics();
        impactGraphics.lineStyle(4, 0xffdd00, 0.8);

        // Draw 8 lines radiating outward
        for (let i = 0; i < 8; i++) {
          const rayAngle = (Math.PI / 4) * i;
          const rayLength = 40;
          impactGraphics.moveTo(this.targetEnemy.x, this.targetEnemy.y);
          impactGraphics.lineTo(this.targetEnemy.x + Math.cos(rayAngle) * rayLength, this.targetEnemy.y + Math.sin(rayAngle) * rayLength);
        }

        // Add "HIT!" text at impact point
        // Calculate better vertical position using displayHeight
        const verticalOffset = this.targetEnemy.displayHeight * 0.7;

        const hitText = this.scene.add.text(this.targetEnemy.x, this.targetEnemy.y - verticalOffset, `HIT! ${actualDamage}`, {
          fontFamily: 'Arial',
          fontSize: '18px',
          color: '#FFDD00',
          stroke: '#000000',
          strokeThickness: 4,
          fontStyle: 'bold',
        });
        hitText.setOrigin(0.5, 0.5);

        this.scene.tweens.add({
          targets: [hitEffect, impactGraphics],
          alpha: 0,
          scale: 2.0,
          duration: 350,
          onComplete: () => {
            hitEffect.destroy();
            impactGraphics.destroy();
          },
        });

        this.scene.tweens.add({
          targets: hitText,
          y: hitText.y - 30,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            hitText.destroy();
          },
        });

        // Check if enemy died from this attack
        if (this.targetEnemy.isDead()) {
          this.registerKill();
        }
      }

      // Remove attack line and label
      line.destroy();
      attackLabel.destroy();

      // Reset attack timer based on attack speed
      this.attackTimer = 1 / this.stats.attackSpeed;
      this.isAttacking = false;
    });
  }

  useAbility(abilityType: AbilityType) {
    const ability = this.abilities[abilityType];
    const currentTime = Date.now();

    // Check if ability is already in use (being executed)
    if (this.abilityInUse[abilityType]) {
      return false;
    }

    // Check if ability is on cooldown
    if (this.abilityCooldowns[abilityType] > 0) {
      // If we've attempted to use this ability recently during cooldown (within 500ms), ignore this request
      if (currentTime - this.abilityInvocationAttempts[abilityType] < 500) {
        return false;
      }

      // Record this attempt
      this.abilityInvocationAttempts[abilityType] = currentTime;
      return false;
    }

    // Reset invocation attempt timestamp when not on cooldown
    this.abilityInvocationAttempts[abilityType] = 0;

    // Check if enough mana
    if (this.stats.mana < ability.manaCost) {
      return false;
    }

    // Use mana
    this.stats.mana -= ability.manaCost;

    // Set cooldown
    this.abilityCooldowns[abilityType] = ability.cooldown;

    // Mark ability as in use
    this.abilityInUse[abilityType] = true;

    // Track when the ability was used
    this.lastAbilityUsedTime = currentTime;

    // Cast the ability based on its type
    let success = false;

    switch (abilityType) {
      case 'Q':
        success = this.castQAbility();
        break;
      case 'W':
        success = this.castWAbility();
        break;
      case 'E':
        success = this.castEAbility();
        break;
      case 'R':
        success = this.castRAbility();
        break;
    }

    if (success) {
      // Emit ability used event
      this.eventManager.emit(GameEvents.ABILITY_USED, abilityType, ability.name);
    } else {
      // If ability cast failed, reset the in-use flag
      this.abilityInUse[abilityType] = false;
    }

    return success;
  }

  private castQAbility() {
    const ability = this.abilities.Q;
    const mousePointer = this.scene.input.activePointer;
    const targetPoint = this.scene.cameras.main.getWorldPoint(mousePointer.x, mousePointer.y);

    // Calculate direction and angle
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetPoint.x, targetPoint.y);

    // Create the main crescent shape using multiple particles to form an arc
    this.createCrescentArc(angle, ability.range);

    // Check for enemies in the path after a delay
    this.scene.time.delayedCall(250, () => {
      const enemies = this.scene.children.getChildren().filter((obj) => obj instanceof Enemy && !(obj as Enemy).isDead()) as Enemy[]; // Filter out dead enemies

      let enemiesHit = 0;

      enemies.forEach((enemy) => {
        // Create an arc of effect in front of the player
        const enemyAngle = Phaser.Math.Angle.Between(this.x, this.y, enemy.x, enemy.y);
        const angleDiff = Phaser.Math.Angle.Wrap(enemyAngle - angle);
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

        // If enemy is within range and within a 60 degree cone of the target direction
        // Increased from 45 degrees to make the arc wider for better gameplay
        if (distance <= ability.range && Math.abs(angleDiff) <= Math.PI / 3) {
          // Apply damage
          let damageAmount = ability.damage;
          enemy.takeDamage(Math.floor(damageAmount));
          enemiesHit++;

          // Mark enemy for Void Rush
          enemy.markForVoidRush();

          // Create a hit effect on the enemy
          this.createHitEffect(enemy.x, enemy.y);

          // Check if enemy died from this ability
          if (enemy.isDead()) {
            this.registerKill();
          }
        }
      });

      // If hit multiple enemies, increase combo more
      if (enemiesHit > 1) {
        // Do nothing
      } else if (enemiesHit === 1) {
        // Do nothing
      }

      // Mark ability as no longer in use after its effect is complete
      this.scene.time.delayedCall(300, () => {
        this.abilityInUse['Q'] = false;
      });
    });

    return true;
  }

  // New helper method to create the crescent arc visual effect
  private createCrescentArc(angle: number, range: number) {
    // Define the crescent arc parameters
    const arcRadius = range * 0.7;
    const arcCenterOffset = range * 0.4;
    const numParticles = 15;
    const arcAngle = Math.PI / 2; // 90 degrees of arc

    // Create a graphics object for the crescent
    const graphics = this.scene.add.graphics();

    // Calculate the center of the arc
    const arcCenterX = this.x + Math.cos(angle) * arcCenterOffset;
    const arcCenterY = this.y + Math.sin(angle) * arcCenterOffset;

    // Start with a glow effect at player position
    graphics.fillStyle(0x80dfff, 0.3);
    graphics.fillCircle(this.x, this.y, 30);

    // Draw the crescent shape
    graphics.lineStyle(8, 0x00ffff, 0.8);

    // Define the crescent curve points
    const points = [];
    for (let i = 0; i <= numParticles; i++) {
      const progress = i / numParticles;
      const particleAngle = angle - arcAngle / 2 + arcAngle * progress;

      // Position each point along the arc
      const particleX = arcCenterX + Math.cos(particleAngle) * arcRadius;
      const particleY = arcCenterY + Math.sin(particleAngle) * arcRadius;

      points.push(new Phaser.Math.Vector2(particleX, particleY));
    }

    // Draw a smooth curve through the points
    const curve = new Phaser.Curves.Spline(points);
    curve.draw(graphics, 64);

    // Add extra visual details - moon particles along the curve
    for (let i = 0; i < numParticles; i += 2) {
      const progress = i / numParticles;
      const particleAngle = angle - arcAngle / 2 + arcAngle * progress;

      const particleX = arcCenterX + Math.cos(particleAngle) * arcRadius;
      const particleY = arcCenterY + Math.sin(particleAngle) * arcRadius;

      // Create a glowing circle at each point
      graphics.fillStyle(0x80dfff, 0.7);
      graphics.fillCircle(particleX, particleY, 5 + Math.sin(progress * Math.PI) * 10);
    }

    // Add a larger particle at the end of the arc for emphasis
    const endX = arcCenterX + Math.cos(angle + arcAngle / 2) * arcRadius;
    const endY = arcCenterY + Math.sin(angle + arcAngle / 2) * arcRadius;
    graphics.fillStyle(0x00ffff, 0.9);
    graphics.fillCircle(endX, endY, 15);

    // Create a trail effect
    const trailGraphics = this.scene.add.graphics();
    trailGraphics.lineStyle(20, 0x00ffff, 0.2);
    trailGraphics.strokeLineShape(
      new Phaser.Geom.Line(this.x, this.y, this.x + Math.cos(angle) * (range * 0.8), this.y + Math.sin(angle) * (range * 0.8))
    );

    // Animate the entire effect
    this.scene.tweens.add({
      targets: [graphics, trailGraphics],
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        graphics.destroy();
        trailGraphics.destroy();
      },
    });

    // Add a flash effect at player position
    const flash = this.scene.add.circle(this.x, this.y, 20, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2.5,
      duration: 300,
      onComplete: () => {
        flash.destroy();
      },
    });

    // Add a visual indicator of the area of effect
    const aoeIndicator = this.scene.add.graphics();
    aoeIndicator.fillStyle(0x00ffff, 0.1);

    // Create a pie/sector shape to visualize the area of effect
    const startAngle = angle - Math.PI / 6; // 30 degrees
    const endAngle = angle + Math.PI / 6; // 30 degrees

    aoeIndicator.beginPath();
    aoeIndicator.moveTo(this.x, this.y);
    aoeIndicator.arc(this.x, this.y, range, startAngle, endAngle);
    aoeIndicator.closePath();
    aoeIndicator.fillPath();

    // Fade out the AOE indicator
    this.scene.tweens.add({
      targets: aoeIndicator,
      alpha: 0,
      duration: 300,
      delay: 300,
      onComplete: () => {
        aoeIndicator.destroy();
      },
    });
  }

  // New helper method to create hit effects on enemies
  private createHitEffect(x: number, y: number) {
    const hit = this.scene.add.circle(x, y, 20, 0x00ffff, 0.7);
    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => {
        hit.destroy();
      },
    });
  }

  private castWAbility() {
    const ability = this.abilities.W;

    // Create orbiting spheres
    const orbitRadius = 50;
    const orbCount = 3;
    const orbs: Phaser.GameObjects.Image[] = [];
    const orbDuration = ability.duration || 5;
    const orbRotationSpeed = 360; // degrees per second

    // Create shield effect first
    const shield = this.scene.add.circle(this.x, this.y, 60, 0x00ffff, 0.3);

    // Add a pulse animation to the shield
    this.scene.tweens.add({
      targets: shield,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.5, to: 0.3 },
      duration: 1000,
      yoyo: true,
      repeat: Math.floor(orbDuration / 2),
      onUpdate: () => {
        shield.x = this.x;
        shield.y = this.y;
      },
      onComplete: () => {
        shield.destroy();
        // Clean up any remaining orbs
        orbs.forEach((orb) => orb.destroy());
        // Mark ability as no longer in use
        this.abilityInUse['W'] = false;
      },
    });

    // Store the base angles for each orb (evenly distributed)
    const baseAngles = [];
    for (let i = 0; i < orbCount; i++) {
      baseAngles.push(i * (360 / orbCount) * (Math.PI / 180)); // Convert to radians
    }

    // Create a container to hold all orbs
    const orbContainer = this.scene.add.container(this.x, this.y);

    // Create and position orbiting spheres
    for (let i = 0; i < orbCount; i++) {
      const orb = this.scene.add.image(0, 0, 'w-effect');
      orb.setScale(0.3);
      orb.setDepth(5); // Ensure orbs render above other elements

      // Add a glow effect
      orb.setTint(0x80ffff);

      // Position orbs in a perfect circle
      const angle = baseAngles[i];
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;
      orb.setPosition(x, y);

      // Store the original angle for this orb
      orb.setData('baseAngle', angle);
      orb.setData('index', i);

      // Add the orb to the container and to our tracking array
      orbContainer.add(orb);
      orbs.push(orb);

      // Add a pulse effect to each orb
      this.scene.tweens.add({
        targets: orb,
        scale: { from: 0.25, to: 0.35 },
        alpha: { from: 0.9, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Create a single rotation animation for the container
    // This ensures orbs maintain their relative positions
    this.scene.tweens.add({
      targets: orbContainer,
      angle: 360, // Rotate full circle
      duration: (360 / orbRotationSpeed) * 1000, // Convert degrees per second to duration
      repeat: Math.floor((orbDuration * orbRotationSpeed) / 360), // Repeat for ability duration
      ease: 'Linear',
      onUpdate: () => {
        // Keep container following the player
        orbContainer.setPosition(this.x, this.y);

        // Check for enemies that touch the orbs
        const enemies = this.scene.children.getChildren().filter((obj) => obj instanceof Enemy && !(obj as Enemy).isDead()) as Enemy[]; // Filter out dead enemies

        // Check each orb against each enemy
        orbs.forEach((orb) => {
          // Calculate world position of the orb
          const worldX = orbContainer.x + orb.x * Math.cos(orbContainer.rotation) - orb.y * Math.sin(orbContainer.rotation);
          const worldY = orbContainer.y + orb.x * Math.sin(orbContainer.rotation) + orb.y * Math.cos(orbContainer.rotation);

          enemies.forEach((enemy) => {
            const distance = Phaser.Math.Distance.Between(worldX, worldY, enemy.x, enemy.y);

            if (distance < 30) {
              // Orb hit radius
              // Apply damage
              let damageAmount = ability.damage / 3; // Divide damage by number of orbs
              enemy.takeDamage(Math.floor(damageAmount));

              // Create impact effect
              const impact = this.scene.add.circle(enemy.x, enemy.y, 20, 0x00ffff, 0.5);

              this.scene.tweens.add({
                targets: impact,
                radius: 40,
                alpha: 0,
                duration: 300,
                onComplete: () => {
                  impact.destroy();
                },
              });

              // Check if enemy died from this ability
              if (enemy.isDead()) {
                this.registerKill();
              }
            }
          });
        });
      },
      onComplete: () => {
        // Destroy the container and all orbs
        orbContainer.destroy();
        orbs.length = 0;
      },
    });

    // Heal the champion slightly
    this.stats.health = Math.min(this.stats.health + 50, this.stats.maxHealth);

    // Emit event for ability use
    this.scene.events.emit('playerAbility', {
      ability: ability.name,
      type: 'shield',
      duration: orbDuration,
    });

    return true;
  }

  private castEAbility() {
    const ability = this.abilities.E;

    // Find closest enemy or target if there is one
    let dashTarget = this.targetEnemy && !this.targetEnemy.isDead() ? this.targetEnemy : null;

    if (!dashTarget) {
      const mousePointer = this.scene.input.activePointer;
      const targetPoint = this.scene.cameras.main.getWorldPoint(mousePointer.x, mousePointer.y);

      // Find enemies in range
      const enemies = this.scene.children.getChildren().filter((obj) => obj instanceof Enemy && !(obj as Enemy).isDead()) as Enemy[]; // Filter out dead enemies

      let closestEnemy: Enemy | null = null;
      let closestDistance = ability.range;

      enemies.forEach((enemy) => {
        const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

        // Check if the enemy is marked by Shadow Strike (Q ability)
        if (distance < closestDistance && enemy.isMarkedForVoidRush()) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      });

      if (closestEnemy) {
        dashTarget = closestEnemy;
      }
    }

    if (dashTarget) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, dashTarget.x, dashTarget.y);

      if (distance <= ability.range) {
        // Start dash
        this.isDashing = true;

        // Create dash effect
        const trail = this.scene.add.graphics();
        trail.lineStyle(3, 0x00ffff, 0.7);
        trail.lineBetween(this.x, this.y, dashTarget.x, dashTarget.y);

        // Move to target rapidly
        this.scene.tweens.add({
          targets: this,
          x: dashTarget.x,
          y: dashTarget.y,
          duration: 300,
          onComplete: () => {
            // Apply damage
            let damageAmount = ability.damage;

            // Deal damage
            if (dashTarget) {
              dashTarget.takeDamage(Math.floor(damageAmount));

              // Check if enemy died from this ability
              if (dashTarget.isDead()) {
                this.registerKill();
              }
            }

            // Create impact effect
            const impact = this.scene.add.circle(dashTarget.x, dashTarget.y, 40, 0x00ffff, 0.5);

            this.scene.tweens.add({
              targets: impact,
              radius: 60,
              alpha: 0,
              duration: 300,
              onComplete: () => {
                impact.destroy();
                // Mark ability as no longer in use
                this.abilityInUse['E'] = false;
              },
            });

            // End dash state
            this.isDashing = false;

            // Destroy trail
            trail.destroy();

            // Reset attack timer (can attack immediately after dash)
            this.attackTimer = 0;
          },
        });
      } else {
        // No valid target in range, reset the in-use flag
        this.abilityInUse['E'] = false;
        return false;
      }
    } else {
      // No target found, reset the in-use flag
      this.abilityInUse['E'] = false;
      return false;
    }

    return true;
  }

  private castRAbility() {
    const ability = this.abilities.R;

    // Create ultimate effect - a large circle that pulls in enemies
    const ultimateCircle = this.scene.add.circle(this.x, this.y, ability.range, 0xffffff, 0.1);

    // Growing animation
    this.scene.tweens.add({
      targets: ultimateCircle,
      radius: { from: 0, to: ability.range },
      alpha: { from: 0.5, to: 0.1 },
      duration: 500,
      onUpdate: () => {
        ultimateCircle.x = this.x;
        ultimateCircle.y = this.y;
      },
      onComplete: () => {
        // Find all enemies in range
        const enemies = this.scene.children.getChildren().filter((obj) => obj instanceof Enemy && !(obj as Enemy).isDead()) as Enemy[]; // Filter out dead enemies

        const affectedEnemies: Enemy[] = [];

        enemies.forEach((enemy) => {
          const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);

          if (distance <= ability.range) {
            affectedEnemies.push(enemy);

            // Create a line showing the pull effect
            const pullLine = this.scene.add.graphics();
            pullLine.lineStyle(2, 0xffffff, 0.7);
            pullLine.lineBetween(enemy.x, enemy.y, this.x, this.y);

            // Pull enemies toward the player
            this.scene.tweens.add({
              targets: enemy,
              x: this.x + (enemy.x - this.x) * 0.3,
              y: this.y + (enemy.y - this.y) * 0.3,
              duration: 500,
              onComplete: () => {
                // Apply damage
                let damageAmount = ability.damage;

                // Deal damage
                enemy.takeDamage(Math.floor(damageAmount));

                // Destroy pull line
                pullLine.destroy();

                // Check if enemy died from this ability
                if (enemy.isDead()) {
                  this.registerKill();
                }
              },
            });
          }
        });

        // Final burst effect
        const burst = this.scene.add.circle(this.x, this.y, 10, 0xffffff, 1);

        this.scene.tweens.add({
          targets: burst,
          radius: ability.range,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            burst.destroy();
            ultimateCircle.destroy();
            // Mark ability as no longer in use
            this.abilityInUse['R'] = false;
          },
        });
      },
    });

    return true;
  }

  isAbilityReady(abilityType: AbilityType): boolean {
    return this.abilityCooldowns[abilityType] <= 0 && this.stats.mana >= this.abilities[abilityType].manaCost;
  }

  getAbilityCooldown(abilityType: string): number {
    return this.abilityCooldowns[abilityType as AbilityType];
  }

  /**
   * Get the maximum cooldown time for an ability
   * @param abilityType The ability type (Q, W, E, R)
   * @returns The maximum cooldown time for the ability
   */
  getAbilityMaxCooldown(abilityType: string): number {
    return this.abilities[abilityType as AbilityType].cooldown;
  }

  takeDamage(amount: number): void {
    // Apply damage
    this.stats.health = Math.max(0, this.stats.health - amount);

    // Update health bar
    this.updateHealthBar();

    // Show damage text
    this.showDamageText(amount);

    // Emit player damaged event
    this.eventManager.emit(GameEvents.PLAYER_DAMAGED, amount, this.stats.health, this.stats.maxHealth);

    // Check if dead
    if (this.isDead()) {
      this.setTint(0x555555);
      this.setAlpha(0.7);
    }
  }

  private showDamageText(amount: number): void {
    // Calculate better vertical position using displayHeight
    const verticalOffset = this.displayHeight * 0.7;

    const damageText = this.scene.add.text(this.x, this.y - verticalOffset, amount.toString(), {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    damageText.setOrigin(0.5, 0.5);

    // Animate the damage text floating up and fading
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        damageText.destroy();
      },
    });
  }

  isDead(): boolean {
    return this.stats.health <= 0;
  }

  getHealth(): number {
    return this.stats.health;
  }

  getMaxHealth(): number {
    return this.stats.maxHealth;
  }

  getMana(): number {
    return this.stats.mana;
  }

  getMaxMana(): number {
    return this.stats.maxMana;
  }

  getMoveSpeed(): number {
    return this.stats.moveSpeed;
  }

  setMoveSpeed(speed: number): void {
    // Validate speed to ensure it's positive
    if (typeof speed === 'number' && speed > 0) {
      // console.log(
      //   `Updating champion move speed from ${this.stats.moveSpeed} to ${speed}`,
      // );
      this.stats.moveSpeed = speed;

      // If the champion is currently moving, immediately apply the new speed
      if (this.moveTarget) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.moveTarget.x, this.moveTarget.y);

        const speedX = Math.cos(angle) * this.stats.moveSpeed;
        const speedY = Math.sin(angle) * this.stats.moveSpeed;

        this.setVelocity(speedX, speedY);
      }
    } else {
      console.warn(`Invalid champion speed value: ${speed}, ignoring`);
    }
  }

  private updateHealthBar() {
    this.healthBar.clear();

    const barWidth = 64;
    const barHeight = 7;

    // Sit the bar just above the hero's head; green keeps it distinct from enemy (red) bars
    const x = this.x - barWidth / 2;
    const y = this.y - this.displayHeight / 2 - 6;

    // Background
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRect(x, y, barWidth, barHeight);

    // Health
    const healthPercent = this.stats.health / this.stats.maxHealth;
    this.healthBar.fillStyle(0x4ade80, 1);
    this.healthBar.fillRect(x + 1, y + 1, (barWidth - 2) * healthPercent, barHeight - 2);
  }

  registerKill() {
    this.killCount++;

    // Emit event for kill
    this.eventManager.emit(GameEvents.ENEMY_DEFEATED, {
      enemyName: 'Monster',
      enemyType: 'jungle',
    });
  }
}
