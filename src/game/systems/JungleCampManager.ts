import * as Phaser from 'phaser';
import { ICharacterStats, JungleMonsterType } from '../types';
import JungleMonster from '../objects/JungleMonster';
import Champion from '../objects/Champion';
import Game from '../scenes/Game';

interface JungleCamp {
  id: string;
  position: { x: number; y: number };
  monsters: JungleMonster[];
  respawnTime: number;
  lastClearTime: number;
  isActive: boolean;
}

export default class JungleCampManager {
  private scene: Game;
  private camps: Map<string, JungleCamp> = new Map();
  private player: Champion | null = null;
  private monsterConfigs: Map<JungleMonsterType, ICharacterStats> = new Map();
  private _campPositions = {
    emberWarden: { x: 1300, y: 500 },
    raptor: { x: 1400, y: 800 },
    brute: { x: 1500, y: 1100 },
  };
  private campLeashRadius = 100; // Define a leash radius for camps

  constructor(scene: Phaser.Scene) {
    this.scene = scene as Game;
    
    // Initialize monster stats configurations
    this.initMonsterConfigs();
  }

  /**
   * Set the player reference after initialization
   */
  public setPlayer(player: Champion | null): void {
    this.player = player;
  }

  /**
   * Get the camp positions for use in other components
   */
  public get campPositions() {
    return this._campPositions;
  }

  private initMonsterConfigs() {
    // Ember Warden monster stats
    this.monsterConfigs.set(JungleMonsterType.EMBER_WARDEN, {
      health: 550,
      maxHealth: 550,
      mana: 0,
      maxMana: 0,
      attackDamage: 55,
      attackSpeed: 0.7,
      attackRange: 100,
      moveSpeed: 70,
    });

    // Raptor stats
    this.monsterConfigs.set(JungleMonsterType.RAPTOR, {
      health: 400,
      maxHealth: 400,
      mana: 0,
      maxMana: 0,
      attackDamage: 40,
      attackSpeed: 0.9,
      attackRange: 80,
      moveSpeed: 90,
    });

    // Small Raptor stats
    this.monsterConfigs.set(JungleMonsterType.SMALL_RAPTOR, {
      health: 150,
      maxHealth: 150,
      mana: 0,
      maxMana: 0,
      attackDamage: 20,
      attackSpeed: 1.2,
      attackRange: 30,
      moveSpeed: 110,
    });

    // Brute stats
    this.monsterConfigs.set(JungleMonsterType.BRUTE, {
      health: 500,
      maxHealth: 500,
      mana: 0,
      maxMana: 0,
      attackDamage: 45,
      attackSpeed: 0.6,
      attackRange: 40,
      moveSpeed: 60,
    });

    // Mini Brute stats
    this.monsterConfigs.set(JungleMonsterType.SHARD_BRUTE, {
      health: 120,
      maxHealth: 120,
      mana: 0,
      maxMana: 0,
      attackDamage: 15,
      attackSpeed: 1.0,
      attackRange: 30,
      moveSpeed: 100,
    });
  }

  /**
   * Create jungle camps at predefined locations across the map
   */
  createJungleCamps() {
    // Create one Ember Warden camp using centralized configuration
    this.createEmberWardenCamp(
      'ember-warden-camp',
      this._campPositions.emberWarden.x,
      this._campPositions.emberWarden.y,
    );

    // Create one Raptor camp using centralized configuration
    this.createRaptorCamp(
      'raptor-camp',
      this._campPositions.raptor.x,
      this._campPositions.raptor.y,
    );

    // Create one Brute camp using centralized configuration
    this.createBruteCamp(
      'brute-camp',
      this._campPositions.brute.x,
      this._campPositions.brute.y,
    );

    // Add a message to inform about camps using the public logGameEvent method
    this.scene.logGameEvent(
      'Jungle camps are scattered across the map. Approach with caution!',
      '#FFFF00',
    );

    // Setup respawn timer check
    this.scene.time.addEvent({
      delay: 5000, // Check every 5 seconds
      callback: this.checkCampRespawns,
      callbackScope: this,
      loop: true,
    });
  }

  /**
   * Creates a Ember Warden jungle camp at specified position
   */
  private createEmberWardenCamp(campId: string, x: number, y: number) {
    const position = { x, y };

    // Create the Ember Warden monster
    const emberWarden = this.createJungleMonster(
      position.x,
      position.y,
      'enemy-emberwarden',
      JungleMonsterType.EMBER_WARDEN,
    );

    // Ensure monster starts aggressive
    emberWarden.setAggressive(true);

    // Register the camp
    this.camps.set(campId, {
      id: campId,
      position,
      monsters: [emberWarden],
      respawnTime: 300000, // 5 minutes in milliseconds
      lastClearTime: 0,
      isActive: true,
    });
  }

  /**
   * Creates a Raptor jungle camp at specified position
   */
  private createRaptorCamp(campId: string, x: number, y: number) {
    const position = { x, y };
    const monsters: JungleMonster[] = [];

    // Create the main Raptor
    const mainRaptor = this.createJungleMonster(
      position.x,
      position.y,
      'enemy-raptor',
      JungleMonsterType.RAPTOR,
    );

    // Initially set monster to aggressive
    mainRaptor.setAggressive(true);
    monsters.push(mainRaptor);

    // Create 5 small raptors around the main one
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2; // Distribute in a circle
      const distance = 50; // Distance from main raptor
      const smallRaptor = this.createJungleMonster(
        position.x + Math.cos(angle) * distance,
        position.y + Math.sin(angle) * distance,
        'enemy-small-raptor',
        JungleMonsterType.SMALL_RAPTOR,
      );

      // Initially set monster to aggressive
      smallRaptor.setAggressive(true);
      monsters.push(smallRaptor);
    }

    // Register the camp
    this.camps.set(campId, {
      id: campId,
      position,
      monsters,
      respawnTime: 240000, // 4 minutes in milliseconds
      lastClearTime: 0,
      isActive: true,
    });
  }

  /**
   * Creates a Brute jungle camp at specified position
   */
  private createBruteCamp(campId: string, x: number, y: number) {
    const position = { x, y };
    const monsters: JungleMonster[] = [];

    // Create a larger main Brute and a smaller brute
    // The large Brute will spawn 4 mini brutes when it dies
    const largeBruteStats = {
      ...this.monsterConfigs.get(JungleMonsterType.BRUTE)!,
    };
    // Enhance the large brute stats
    largeBruteStats.health = 800;
    largeBruteStats.maxHealth = 800;
    largeBruteStats.attackDamage = 60;

    // Large main Brute
    const largeBrute = this.createJungleMonster(
      position.x - 50,
      position.y,
      'enemy-brute',
      JungleMonsterType.BRUTE,
      largeBruteStats,
    );

    // Set a custom property to indicate this is the large brute
    (largeBrute as any).isLargeBrute = true;

    // Second main Brute (smaller)
    const normalBrute = this.createJungleMonster(
      position.x + 50,
      position.y,
      'enemy-brute',
      JungleMonsterType.BRUTE,
    );

    // Initially set monsters to aggressive
    largeBrute.setAggressive(true);
    normalBrute.setAggressive(true);

    monsters.push(largeBrute);
    monsters.push(normalBrute);

    // Register the camp
    this.camps.set(campId, {
      id: campId,
      position,
      monsters,
      respawnTime: 240000, // 4 minutes in milliseconds
      lastClearTime: 0,
      isActive: true,
    });
  }

  /**
   * Helper method to create a jungle monster
   */
  private createJungleMonster(
    x: number,
    y: number,
    texture: string,
    monsterType: JungleMonsterType,
    customStats: ICharacterStats | null = null,
  ): JungleMonster {
    // Get the predefined stats for this monster type
    const monsterStats = customStats || this.monsterConfigs.get(monsterType);

    if (!monsterStats) {
      throw new Error(
        `No stats configuration found for monster type: ${monsterType}`,
      );
    }

    // Create and return the monster
    const monster = new JungleMonster(
      this.scene as Game,
      x,
      y,
      texture,
      monsterType,
      monsterStats,
      null, // No parent Brute
      `camp-${monsterType}`, // Default camp ID
      monsterType,
    );

    // Set player reference if available
    if (this.player) {
      monster.setPlayer(this.player);
    }
   
    monster.setLeashRadius(this.campLeashRadius);
    
    // Set monster to be aggressive by default
    monster.setAggressive(true);

    // Add to scene's enemies array
    const gameScene = this.scene as Game;
    const enemies = gameScene.getEnemies();
    if (enemies) {
      enemies.push(monster);
    } else {
      console.warn('No enemies array found in scene to add jungle monster to.');
    }

    return monster;
  }

  /**
   * Check if any camps need to be respawned
   */
  private checkCampRespawns = () => {
    const currentTime = this.scene.time.now;

    this.camps.forEach((camp) => {
      // If camp is not active and respawn time has passed
      if (
        !camp.isActive &&
        camp.lastClearTime > 0 &&
        currentTime - camp.lastClearTime > camp.respawnTime
      ) {
        this.respawnCamp(camp.id);
      }

      // Check if camp is cleared (all monsters dead or inactive)
      if (
        camp.isActive &&
        camp.monsters.every(
          (monster) => monster.isDead() || !monster.active || !monster.visible,
        )
      ) {
        camp.isActive = false;
        camp.lastClearTime = currentTime;

        // Log message about camp being cleared
        this.scene.logGameEvent(
          `${camp.id.replace('-', ' ')} has been cleared. It will respawn in ${camp.respawnTime / 60000} minutes.`,
          '#FFFF00',
        );
      }
    });
  };

  /**
   * Respawn a jungle camp
   */
  private respawnCamp(campId: string) {
    const camp = this.camps.get(campId);

    if (!camp) {
      console.error(`Camp with ID ${campId} not found`);
      return;
    }

    // Create a respawn visual effect at the camp position
    this.createRespawnEffect(camp.position.x, camp.position.y);

    // Log message about camp respawning
    this.scene.logGameEvent(
      `${campId.replace('-', ' ')} has respawned!`,
      '#00FF00',
    );

    // Clear any existing monsters
    camp.monsters.forEach((monster) => {
      if (monster && monster.scene) {
        monster.destroy();
      }
    });

    camp.monsters = [];

    // Extract camp type from the id
    const isEmberWarden = campId.includes('ember-warden');
    const isRaptor = campId.includes('raptor');
    const isBrute = campId.includes('brute');

    // Respawn appropriate monsters based on camp type
    if (isEmberWarden) {
      const emberWarden = this.createJungleMonster(
        camp.position.x,
        camp.position.y,
        'enemy-emberwarden',
        JungleMonsterType.EMBER_WARDEN,
      );
      emberWarden.setAggressive(true);
      camp.monsters.push(emberWarden);
    } else if (isRaptor) {
      // Main raptor
      const mainRaptor = this.createJungleMonster(
        camp.position.x,
        camp.position.y,
        'enemy-raptor',
        JungleMonsterType.RAPTOR,
      );
      mainRaptor.setAggressive(true);
      camp.monsters.push(mainRaptor);

      // 5 small raptors
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const distance = 50;
        const smallRaptor = this.createJungleMonster(
          camp.position.x + Math.cos(angle) * distance,
          camp.position.y + Math.sin(angle) * distance,
          'enemy-small-raptor',
          JungleMonsterType.SMALL_RAPTOR,
        );
        smallRaptor.setAggressive(true);
        camp.monsters.push(smallRaptor);
      }
    } else if (isBrute) {
      // Get the positions of the original brutes
      const originalPositions = camp.monsters.map((m) => ({
        x: m.x,
        y: m.y,
        isLargeBrute: (m as any).isLargeBrute,
      }));

      // Clear the monsters array
      camp.monsters = [];

      // Respawn both brutes at their original positions
      originalPositions.forEach((pos, index) => {
        const isLargeBrute = pos.isLargeBrute;

        // Create the brute with appropriate stats
        const bruteStats = isLargeBrute
          ? {
              ...this.monsterConfigs.get(JungleMonsterType.BRUTE)!,
              health: 800,
              maxHealth: 800,
              attackDamage: 60,
            }
          : null;

        const brute = this.createJungleMonster(
          pos.x,
          pos.y,
          'enemy-brute',
          JungleMonsterType.BRUTE,
          bruteStats,
        );

        // Set the isLargeBrute property for the large brute
        if (isLargeBrute) {
          (brute as any).isLargeBrute = true;
        }

        brute.setAggressive(true);
        camp.monsters.push(brute);
      });
    }

    // Mark camp as active again
    camp.isActive = true;
    camp.lastClearTime = 0;
  }

  /**
   * Create a visual effect for camp respawn
   */
  private createRespawnEffect(x: number, y: number) {
    // Create a pulsing circle effect
    const respawnCircle = this.scene.add.circle(x, y, 50, 0x00ff00, 0.3);

    // Check if particle texture exists, otherwise generate a simple one
    if (!this.scene.textures.exists('particle')) {
      this.generateParticleTexture();
    }

    // Add a particle effect
    const particles = this.scene.add.particles(x, y, 'particle', {
      speed: { min: 100, max: 200 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      lifespan: 1000,
      quantity: 20,
    });

    // Animate the circle
    this.scene.tweens.add({
      targets: respawnCircle,
      scale: 2,
      alpha: 0,
      duration: 1500,
      onComplete: () => {
        respawnCircle.destroy();

        // Stop particles after a short delay
        this.scene.time.delayedCall(1000, () => {
          particles.destroy();
        });
      },
    });
  }

  /**
   * Generate a simple particle texture if none exists
   */
  private generateParticleTexture() {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Draw a simple circle for the particle
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(8, 8, 8);

    // Create the texture
    graphics.generateTexture('particle', 16, 16);
    graphics.destroy();
  }

  /**
   * Get all jungle monsters from all camps
   */
  getAllMonsters(): JungleMonster[] {
    const allMonsters: JungleMonster[] = [];

    this.camps.forEach((camp) => {
      camp.monsters.forEach((monster) => {
        allMonsters.push(monster);
      });
    });

    return allMonsters;
  }
}
