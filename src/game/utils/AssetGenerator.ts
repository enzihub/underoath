/**
 * AssetGenerator.ts
 * Utility functions to generate placeholder assets for our dark-fantasy action RPG
 * These will be used during development before real assets are integrated
 */

import * as Phaser from 'phaser';

/**
 * Asset categories for better organization
 */
export enum AssetCategory {
  CHAMPION = 'champion',
  MINION = 'minion',
  MAP = 'map',
  UI = 'ui',
  ABILITY = 'ability',
  EFFECT = 'effect',
}

/**
 * Asset management system for the game
 */
export default class AssetGenerator {
  private scene: Phaser.Scene;
  private assetRegistry: Map<string, string> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Generate all placeholder assets needed for the game
   */
  generateAllAssets(): void {
    // Generate player champion textures
    this.generateChampionTexture();

    // Generate enemy textures
    this.generateMinionTexture();
    this.generateDarkLordTexture();

    // Generate effect textures
    this.generateEffectTextures();

    // Generate UI elements
    this.generateUIElements();
  }

  /**
   * Register an asset in the asset registry
   */
  registerAsset(key: string, category: AssetCategory, path?: string): void {
    this.assetRegistry.set(key, path || key);
  }

  /**
   * Get an asset key from the registry
   */
  getAssetKey(key: string): string {
    return this.assetRegistry.get(key) || key;
  }

  /**
   * Generate champion assets
   */
  private generateChampionAssets(): void {
    this.generateHeroAsset();
    this.generateDarkLordAsset();
    // More champions can be added here
  }

  /**
   * Generate a simple champion sprite (Hero)
   */
  private generateHeroAsset(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Champion body (darker blue/purple for Hero)
    graphics.fillStyle(0x8e44ad); // Purple color for Hero
    graphics.fillCircle(50, 50, 40);

    // Face
    graphics.fillStyle(0xf5e8c1); // Skin tone
    graphics.fillCircle(50, 40, 15);

    // Moon symbol on forehead
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(50, 30, 8);
    graphics.fillStyle(0x8e44ad);
    graphics.fillCircle(54, 30, 5);

    // Hair (white/silver)
    graphics.fillStyle(0xe8e8e8);
    graphics.fillRect(30, 15, 40, 15);
    graphics.fillCircle(30, 25, 10);
    graphics.fillCircle(70, 25, 10);

    // Weapon (crescent moon blade)
    graphics.fillStyle(0xe8e8e8); // Silver color
    graphics.fillCircle(85, 30, 12);
    graphics.fillStyle(0x8e44ad); // Purple inner part
    graphics.fillCircle(85, 30, 8);
    graphics.fillStyle(0xe8e8e8); // Silver color
    graphics.fillRect(75, 30, 20, 5);
    graphics.fillRect(85, 20, 5, 25);

    // Armor details
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(35, 50, 8);
    graphics.fillCircle(65, 50, 8);
    graphics.fillRect(45, 60, 10, 25);

    const textureKey = 'hero';
    graphics.generateTexture(textureKey, 100, 100);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.CHAMPION);
  }

  /**
   * Generate a DarkLord enemy asset
   */
  public generateDarkLordAsset(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Create a more detailed DarkLord silhouette
    graphics.fillStyle(0x5d4777, 1); // Base color - purple-gray

    // Wolf body
    graphics.fillRect(-20, -15, 50, 35);

    // Wolf head
    graphics.fillStyle(0x4a3a62, 1); // Darker purple for head
    graphics.fillCircle(25, 0, 18);

    // Eyes
    graphics.fillStyle(0xff4500, 1); // Orange-red eyes
    graphics.fillCircle(28, -7, 5);
    graphics.fillCircle(28, 7, 5);
    graphics.fillStyle(0xffffff, 0.7); // Eye glint
    graphics.fillCircle(29, -6, 2);
    graphics.fillCircle(29, 8, 2);

    // Ears
    graphics.fillStyle(0x5d4777, 1);
    graphics.fillTriangle(20, -15, 30, -30, 40, -10);
    graphics.fillTriangle(20, 15, 30, 30, 40, 10);

    // Snout
    graphics.fillStyle(0x4a3a62, 1);
    graphics.fillRect(35, -8, 18, 16);

    // Nose
    graphics.fillStyle(0x2c2239, 1);
    graphics.fillRect(50, -5, 5, 10);

    // Teeth
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(42, -7, 3, 5);
    graphics.fillRect(42, 2, 3, 5);
    graphics.fillRect(47, -6, 3, 4);
    graphics.fillRect(47, 2, 3, 4);

    // Claws
    graphics.fillStyle(0xc0c0c0, 1);
    graphics.fillRect(-20, -17, 5, 5);
    graphics.fillRect(-15, -18, 5, 5);
    graphics.fillRect(-20, 13, 5, 5);
    graphics.fillRect(-15, 14, 5, 5);

    // Generate texture
    const textureKey = 'darklord-enemy';
    graphics.generateTexture(textureKey, 80, 60);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.CHAMPION);
  }

  /**
   * Generate minion assets
   */
  private generateMinionAssets(): void {
    this.generateBlueMinion();
    this.generateRedMinion();
    this.generateMeleeMinion('blue');
    this.generateMeleeMinion('red');
    this.generateRangedMinion('blue');
    this.generateRangedMinion('red');
    this.generateSuperMinion('blue');
    this.generateSuperMinion('red');
    this.generateCannonMinion('blue');
    this.generateCannonMinion('red');
  }

  /**
   * Generate a blue minion sprite
   */
  private generateBlueMinion(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Minion body (blue)
    graphics.fillStyle(0x3498db);
    graphics.fillCircle(30, 30, 25);

    // Minion details
    graphics.fillStyle(0x000000);
    graphics.fillCircle(20, 25, 5);
    graphics.fillCircle(40, 25, 5);
    graphics.lineStyle(2, 0x000000);
    graphics.lineBetween(20, 40, 40, 40);

    // Minion helmet/armor
    graphics.fillStyle(0x2980b9);
    graphics.fillRect(10, 10, 40, 15);
    graphics.fillStyle(0xf39c12);
    graphics.fillRect(25, 5, 10, 5);

    const textureKey = 'minion-blue-fallback';
    graphics.generateTexture(textureKey, 60, 60);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate a red minion sprite
   */
  private generateRedMinion(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Minion body (red)
    graphics.fillStyle(0xe74c3c);
    graphics.fillCircle(30, 30, 25);

    // Minion details
    graphics.fillStyle(0x000000);
    graphics.fillCircle(20, 25, 5);
    graphics.fillCircle(40, 25, 5);
    graphics.lineStyle(2, 0x000000);
    graphics.lineBetween(20, 40, 40, 40);

    // Minion helmet/armor
    graphics.fillStyle(0xc0392b);
    graphics.fillRect(10, 10, 40, 15);
    graphics.fillStyle(0xf39c12);
    graphics.fillRect(25, 5, 10, 5);

    const textureKey = 'minion-red-fallback';
    graphics.generateTexture(textureKey, 60, 60);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate a melee minion sprite in specified color
   */
  private generateMeleeMinion(color: 'blue' | 'red'): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const primaryColor = color === 'blue' ? 0x3498db : 0xe74c3c;
    const secondaryColor = color === 'blue' ? 0x2980b9 : 0xc0392b;
    const accentColor = 0xf39c12; // Gold for both teams

    // Minion body
    graphics.fillStyle(primaryColor);
    graphics.fillCircle(30, 35, 25);

    // Minion legs
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(20, 50, 7, 15);
    graphics.fillRect(33, 50, 7, 15);

    // Minion face
    graphics.fillStyle(0x000000);
    graphics.fillCircle(23, 30, 4); // Left eye
    graphics.fillCircle(37, 30, 4); // Right eye

    // Minion helmet
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(15, 10, 30, 15);

    // Helmet details
    graphics.fillStyle(accentColor);
    graphics.fillRect(25, 5, 10, 5);

    // Weapon (club)
    graphics.fillStyle(0x5d4037); // Brown
    graphics.fillRect(50, 25, 5, 20); // Handle
    graphics.fillStyle(0x795548); // Lighter brown
    graphics.fillCircle(55, 20, 10); // Club head

    const textureKey = `minion-melee-${color}`;
    graphics.generateTexture(textureKey, 80, 70);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate a ranged minion sprite in specified color
   */
  private generateRangedMinion(color: 'blue' | 'red'): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const primaryColor = color === 'blue' ? 0x3498db : 0xe74c3c;
    const secondaryColor = color === 'blue' ? 0x2980b9 : 0xc0392b;
    const accentColor = 0xf39c12; // Gold for both teams

    // Minion body
    graphics.fillStyle(primaryColor);
    graphics.fillCircle(30, 35, 25);

    // Minion legs
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(20, 50, 7, 15);
    graphics.fillRect(33, 50, 7, 15);

    // Minion face
    graphics.fillStyle(0x000000);
    graphics.fillCircle(23, 30, 4); // Left eye
    graphics.fillCircle(37, 30, 4); // Right eye

    // Hooded cape
    graphics.fillStyle(secondaryColor);
    graphics.fillCircle(30, 20, 20);

    // Hood details
    graphics.fillStyle(accentColor);
    graphics.fillRect(25, 5, 10, 5);

    // Weapon (staff with crystal)
    graphics.fillStyle(0x5d4037); // Brown
    graphics.fillRect(10, 20, 5, 30); // Staff
    graphics.fillStyle(color === 'blue' ? 0x00ffff : 0xff6b6b); // Crystal color
    graphics.fillCircle(10, 15, 7); // Crystal

    const textureKey = `minion-ranged-${color}`;
    graphics.generateTexture(textureKey, 80, 70);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate a super minion sprite in specified color
   */
  private generateSuperMinion(color: 'blue' | 'red'): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const primaryColor = color === 'blue' ? 0x3498db : 0xe74c3c;
    const secondaryColor = color === 'blue' ? 0x2980b9 : 0xc0392b;
    const accentColor = 0xf39c12; // Gold for both teams

    // Larger minion body
    graphics.fillStyle(primaryColor);
    graphics.fillCircle(40, 45, 35);

    // Minion legs (thicker)
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(25, 65, 12, 20);
    graphics.fillRect(43, 65, 12, 20);

    // Minion face (angrier)
    graphics.fillStyle(0x000000);
    graphics.fillCircle(30, 40, 5); // Left eye
    graphics.fillCircle(50, 40, 5); // Right eye
    graphics.fillRect(30, 55, 20, 3); // Frown

    // Heavy armor
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(20, 15, 40, 20);

    // Armor details
    graphics.fillStyle(accentColor);
    graphics.fillRect(30, 5, 20, 10);
    graphics.fillCircle(40, 25, 10);

    // Large fists
    graphics.fillStyle(secondaryColor);
    graphics.fillCircle(15, 45, 12);
    graphics.fillCircle(65, 45, 12);

    const textureKey = `minion-super-${color}`;
    graphics.generateTexture(textureKey, 100, 90);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate a cannon minion sprite in specified color
   */
  private generateCannonMinion(color: 'blue' | 'red'): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const primaryColor = color === 'blue' ? 0x3498db : 0xe74c3c;
    const secondaryColor = color === 'blue' ? 0x2980b9 : 0xc0392b;
    const accentColor = 0xf39c12; // Gold for both teams

    // Cannon base (wheeled platform)
    graphics.fillStyle(0x5d4037); // Brown wooden base
    graphics.fillRect(20, 50, 40, 15);

    // Wheels
    graphics.fillStyle(0x4d3833);
    graphics.fillCircle(25, 65, 8);
    graphics.fillCircle(55, 65, 8);

    // Cannon body
    graphics.fillStyle(secondaryColor);
    graphics.fillRect(25, 30, 30, 20);

    // Cannon barrel
    graphics.fillStyle(primaryColor);
    graphics.fillRect(40, 15, 15, 25);

    // Minion operator
    // Head
    graphics.fillStyle(primaryColor);
    graphics.fillCircle(25, 25, 15);

    // Face
    graphics.fillStyle(0x000000);
    graphics.fillCircle(20, 20, 3);
    graphics.fillCircle(30, 20, 3);

    // Helmet
    graphics.fillStyle(accentColor);
    graphics.fillRect(15, 10, 20, 5);

    const textureKey = `minion-cannon-${color}`;
    graphics.generateTexture(textureKey, 80, 80);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MINION);
  }

  /**
   * Generate map related assets
   */
  private generateMapAssets(): void {
    this.generateMapBackground();
    this.generateTerrainOverlay();
  }

  /**
   * Generate a simple map background
   */
  private generateMapBackground(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const mapSize = 1024;

    // Map background (green)
    graphics.fillStyle(0x0a2e38); // Dark blue-green
    graphics.fillRect(0, 0, mapSize, mapSize);

    // Draw rivers
    graphics.fillStyle(0x1a617a); // Light blue

    // Diagonal river (bottom-left to top-right)
    graphics.beginPath();
    graphics.moveTo(mapSize * 0.1, mapSize * 0.9);
    graphics.lineTo(mapSize * 0.9, mapSize * 0.1);
    graphics.lineTo(mapSize * 0.95, mapSize * 0.15);
    graphics.lineTo(mapSize * 0.15, mapSize * 0.95);
    graphics.closePath();
    graphics.fill();

    // Top river
    graphics.beginPath();
    graphics.moveTo(mapSize * 0.3, 0);
    graphics.lineTo(mapSize * 0.7, 0);
    graphics.lineTo(mapSize * 0.65, mapSize * 0.2);
    graphics.lineTo(mapSize * 0.35, mapSize * 0.2);
    graphics.closePath();
    graphics.fill();

    // Bottom river
    graphics.beginPath();
    graphics.moveTo(mapSize * 0.3, mapSize);
    graphics.lineTo(mapSize * 0.7, mapSize);
    graphics.lineTo(mapSize * 0.65, mapSize * 0.8);
    graphics.lineTo(mapSize * 0.35, mapSize * 0.8);
    graphics.closePath();
    graphics.fill();

    // Draw paths
    graphics.lineStyle(10, 0x41674a);

    // Top lane
    graphics.beginPath();
    graphics.moveTo(0, mapSize * 0.3);
    graphics.lineTo(mapSize * 0.3, 0);
    graphics.stroke();

    // Mid lane
    graphics.beginPath();
    graphics.moveTo(0, mapSize);
    graphics.lineTo(mapSize, 0);
    graphics.stroke();

    // Bottom lane
    graphics.beginPath();
    graphics.moveTo(mapSize * 0.7, mapSize);
    graphics.lineTo(mapSize, mapSize * 0.7);
    graphics.stroke();

    // Draw bases
    graphics.fillStyle(0x3498db); // Blue base
    graphics.fillCircle(mapSize * 0.1, mapSize * 0.1, mapSize * 0.1);

    graphics.fillStyle(0xe74c3c); // Red base
    graphics.fillCircle(mapSize * 0.9, mapSize * 0.9, mapSize * 0.1);

    const textureKey = 'map';
    graphics.generateTexture(textureKey, mapSize, mapSize);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MAP);
  }

  /**
   * Generate a terrain overlay
   */
  private generateTerrainOverlay(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    const terrainSize = 3000; // Larger texture for full map

    // Transparent base
    graphics.fillStyle(0x000000, 0);
    graphics.fillRect(0, 0, terrainSize, terrainSize);

    // Draw jungle areas (semi-transparent)
    graphics.fillStyle(0x056d2b, 0.3); // Dark green

    // Define a function to draw bushes
    const drawBush = (x: number, y: number, radius: number) => {
      graphics.fillStyle(0x27ae60, 0.5); // Green
      graphics.fillCircle(x, y, radius);

      // Add detail to bushes
      graphics.fillStyle(0x2ecc71, 0.3);
      graphics.fillCircle(x - radius * 0.3, y - radius * 0.3, radius * 0.4);
      graphics.fillCircle(x + radius * 0.2, y + radius * 0.3, radius * 0.5);
    };

    // Add bushes to various map locations
    drawBush(terrainSize * 0.2, terrainSize * 0.2, 100);
    drawBush(terrainSize * 0.8, terrainSize * 0.8, 100);
    drawBush(terrainSize * 0.5, terrainSize * 0.5, 80);
    drawBush(terrainSize * 0.3, terrainSize * 0.7, 90);
    drawBush(terrainSize * 0.7, terrainSize * 0.3, 90);

    const textureKey = 'terrain';
    graphics.generateTexture(textureKey, terrainSize, terrainSize);
    graphics.clear();
    this.registerAsset(textureKey, AssetCategory.MAP);
  }

  /**
   * Generate UI assets
   */
  private generateUIAssets(): void {
    this.generateTargetIndicator();
    this.generateHealthBar();
    this.generateAbilityIcons();
  }

  /**
   * Generate a target indicator for selecting enemies
   */
  private generateTargetIndicator(): void {
    if (!this.scene.textures.exists('attack-indicator')) {
      const graphics = this.scene.make.graphics({});

      // Attack indicator (red triangle)
      graphics.fillStyle(0xff0000);
      graphics.fillTriangle(16, 0, 32, 32, 0, 32);

      graphics.generateTexture('attack-indicator', 32, 32);
      graphics.clear();
      this.registerAsset('attack-indicator', AssetCategory.UI);
    }
  }

  /**
   * Generate health and mana bar assets
   */
  private generateHealthBar(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Health bar
    graphics.fillStyle(0xed1c24);
    graphics.fillRect(0, 0, 100, 20);

    const healthBarKey = 'health-bar';
    graphics.generateTexture(healthBarKey, 100, 20);
    graphics.clear();
    this.registerAsset(healthBarKey, AssetCategory.UI);

    // Mana bar
    graphics.fillStyle(0x1c57ed);
    graphics.fillRect(0, 0, 100, 20);

    const manaBarKey = 'mana-bar';
    graphics.generateTexture(manaBarKey, 100, 20);
    graphics.clear();
    this.registerAsset(manaBarKey, AssetCategory.UI);

    // Range indicator
    graphics.lineStyle(2, 0xffffff, 0.5);
    graphics.strokeCircle(100, 100, 100);

    const rangeKey = 'range-indicator';
    graphics.generateTexture(rangeKey, 200, 200);
    graphics.clear();
    this.registerAsset(rangeKey, AssetCategory.UI);
  }

  /**
   * Generate ability icons frame
   */
  private generateAbilityIcons(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Ability frame
    graphics.lineStyle(4, 0xffffff);
    graphics.strokeRect(2, 2, 60, 60);
    graphics.fillStyle(0x333333);
    graphics.fillRect(2, 2, 60, 60);

    const frameKey = 'ability-frame';
    graphics.generateTexture(frameKey, 64, 64);
    graphics.clear();
    this.registerAsset(frameKey, AssetCategory.UI);

    // Settings icon
    graphics.lineStyle(4, 0xffffff);
    graphics.strokeCircle(16, 16, 12);

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = 16 + Math.cos(angle) * 10;
      const y1 = 16 + Math.sin(angle) * 10;
      const x2 = 16 + Math.cos(angle) * 18;
      const y2 = 16 + Math.sin(angle) * 18;
      graphics.lineBetween(x1, y1, x2, y2);
    }

    const settingsKey = 'settings-icon';
    graphics.generateTexture(settingsKey, 32, 32);
    graphics.clear();
    this.registerAsset(settingsKey, AssetCategory.UI);
  }

  /**
   * Generate ability assets
   */
  private generateAbilityAssets(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Q ability - Shadow Strike
    graphics.fillStyle(0xc183fa); // Light purple
    graphics.fillCircle(32, 32, 30);
    graphics.lineStyle(5, 0xffffff);
    graphics.beginPath();
    graphics.arc(32, 32, 20, 0, Math.PI, true);
    graphics.stroke();
    graphics.generateTexture('q-ability', 64, 64);
    graphics.clear();

    // W ability - Protective Aura
    graphics.fillStyle(0x8a56d3); // Medium purple
    graphics.fillCircle(32, 32, 30);
    graphics.lineStyle(4, 0xffffff);
    graphics.strokeCircle(32, 32, 15);
    graphics.strokeCircle(32, 32, 22);
    graphics.generateTexture('w-ability', 64, 64);
    graphics.clear();

    // E ability - Void Rush
    graphics.fillStyle(0x6a3ab6); // Darker purple
    graphics.fillCircle(32, 32, 30);
    graphics.lineStyle(4, 0xffffff);
    graphics.lineBetween(15, 15, 49, 49);
    graphics.lineBetween(15, 49, 49, 15);
    graphics.generateTexture('e-ability', 64, 64);
    graphics.clear();

    // R ability - Darkfall
    graphics.fillStyle(0x4a2988); // Deep purple
    graphics.fillCircle(32, 32, 30);
    graphics.lineStyle(4, 0xffffff);
    graphics.strokeCircle(32, 32, 20);

    // Draw arrows pointing inward
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x1 = 32 + Math.cos(angle) * 30;
      const y1 = 32 + Math.sin(angle) * 30;
      const x2 = 32 + Math.cos(angle) * 20;
      const y2 = 32 + Math.sin(angle) * 20;
      graphics.lineBetween(x1, y1, x2, y2);
    }

    graphics.generateTexture('r-ability', 64, 64);
    graphics.clear();

    this.registerAsset('q-ability', AssetCategory.ABILITY);
    this.registerAsset('w-ability', AssetCategory.ABILITY);
    this.registerAsset('e-ability', AssetCategory.ABILITY);
    this.registerAsset('r-ability', AssetCategory.ABILITY);
  }

  /**
   * Generate effect textures for abilities and attacks
   */
  private generateEffectTextures(): void {
    // Create ability effect textures
    this.generateAbilityEffects();

    // Create particle effects
    this.generateParticleEffects();
  }

  /**
   * Generate ability effect textures
   */
  private generateAbilityEffects(): void {
    const graphics = this.scene.make.graphics({});

    // Q effect - Crescent shape
    if (!this.scene.textures.exists('q-effect')) {
      graphics.fillStyle(0xc183fa); // Light purple
      graphics.fillCircle(64, 32, 30);
      graphics.lineStyle(5, 0xffffff);
      graphics.beginPath();
      graphics.arc(64, 32, 25, 0, Math.PI * 2);
      graphics.stroke();

      // Draw crescent shape
      graphics.fillStyle(0x000000);
      graphics.fillCircle(44, 32, 25);

      graphics.generateTexture('q-effect', 128, 64);
      graphics.clear();
      this.registerAsset('q-effect', AssetCategory.EFFECT);
    }

    // W effect - Orbiting sphere
    if (!this.scene.textures.exists('w-effect')) {
      graphics.fillStyle(0x8a56d3);
      graphics.fillCircle(32, 32, 25);
      graphics.lineStyle(4, 0xffffff);
      graphics.strokeCircle(32, 32, 25);
      graphics.generateTexture('w-effect', 64, 64);
      graphics.clear();
      this.registerAsset('w-effect', AssetCategory.EFFECT);
    }

    // E effect - Dash line
    if (!this.scene.textures.exists('e-effect')) {
      graphics.lineStyle(8, 0x6a3ab6);
      graphics.lineBetween(0, 32, 64, 32);
      graphics.lineStyle(4, 0xffffff);
      graphics.lineBetween(0, 32, 64, 32);
      graphics.generateTexture('e-effect', 64, 64);
      graphics.clear();
      this.registerAsset('e-effect', AssetCategory.EFFECT);
    }

    // R effect - Darkfall
    if (!this.scene.textures.exists('r-effect')) {
      graphics.fillStyle(0x4a2988, 0.7);
      graphics.fillCircle(64, 64, 60);
      graphics.lineStyle(4, 0xffffff, 0.8);
      graphics.strokeCircle(64, 64, 60);

      // Draw arrows pointing inward
      for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI) / 6;
        const x1 = 64 + Math.cos(angle) * 60;
        const y1 = 64 + Math.sin(angle) * 60;
        const x2 = 64 + Math.cos(angle) * 40;
        const y2 = 64 + Math.sin(angle) * 40;
        graphics.lineBetween(x1, y1, x2, y2);
      }

      graphics.generateTexture('r-effect', 128, 128);
      graphics.clear();
      this.registerAsset('r-effect', AssetCategory.EFFECT);
    }
  }

  /**
   * Generate particle effects for impacts and visual feedback
   */
  private generateParticleEffects(): void {
    const graphics = this.scene.make.graphics({});

    // Basic particle
    if (!this.scene.textures.exists('particle')) {
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(8, 8, 8);
      graphics.generateTexture('particle', 16, 16);
      graphics.clear();
      this.registerAsset('particle', AssetCategory.EFFECT);
    }

    // Attack impact
    if (!this.scene.textures.exists('impact')) {
      graphics.fillStyle(0xffdd00, 0.8);

      // Draw a star shape using path
      const centerX = 32;
      const centerY = 32;
      const outerRadius = 32;
      const innerRadius = 10;
      const points = 5;

      // Calculate points for the star
      const angle = (Math.PI * 2) / (points * 2);

      // Begin path for the star
      graphics.beginPath();

      // Draw the star points
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = centerX + Math.cos(angle * i - Math.PI / 2) * radius;
        const y = centerY + Math.sin(angle * i - Math.PI / 2) * radius;

        if (i === 0) {
          graphics.moveTo(x, y);
        } else {
          graphics.lineTo(x, y);
        }
      }

      // Close the path and fill
      graphics.closePath();
      graphics.fillPath();

      graphics.generateTexture('impact', 64, 64);
      graphics.clear();
      this.registerAsset('impact', AssetCategory.EFFECT);
    }
  }

  /**
   * Generate UI elements for the game interface
   */
  private generateUIElements(): void {
    // Generate attack target indicator
    this.generateTargetIndicator();

    // Generate ability frames and icons
    this.generateAbilityFrames();

    // Generate health and mana bars
    this.generateStatusBars();
  }

  /**
   * Generate ability frames and icons
   */
  private generateAbilityFrames(): void {
    const graphics = this.scene.make.graphics({});

    // Ability frame
    if (!this.scene.textures.exists('ability-frame')) {
      graphics.lineStyle(4, 0xffffff);
      graphics.strokeRect(2, 2, 60, 60);
      graphics.fillStyle(0x333333);
      graphics.fillRect(2, 2, 60, 60);

      graphics.generateTexture('ability-frame', 64, 64);
      graphics.clear();
      this.registerAsset('ability-frame', AssetCategory.UI);
    }

    // Ability cooldown overlay
    if (!this.scene.textures.exists('cooldown-overlay')) {
      graphics.fillStyle(0x000000, 0.7);
      graphics.fillRect(0, 0, 64, 64);

      graphics.generateTexture('cooldown-overlay', 64, 64);
      graphics.clear();
      this.registerAsset('cooldown-overlay', AssetCategory.UI);
    }
  }

  /**
   * Generate health and mana bars
   */
  private generateStatusBars(): void {
    const graphics = this.scene.make.graphics({});

    // Health bar background
    if (!this.scene.textures.exists('health-bar-bg')) {
      graphics.fillStyle(0x000000, 0.7);
      graphics.fillRect(0, 0, 100, 10);
      graphics.lineStyle(1, 0xffffff, 0.3);
      graphics.strokeRect(0, 0, 100, 10);

      graphics.generateTexture('health-bar-bg', 100, 10);
      graphics.clear();
      this.registerAsset('health-bar-bg', AssetCategory.UI);
    }

    // Health bar fill
    if (!this.scene.textures.exists('health-bar')) {
      graphics.fillStyle(0xff0000);
      graphics.fillRect(0, 0, 100, 10);

      graphics.generateTexture('health-bar', 100, 10);
      graphics.clear();
      this.registerAsset('health-bar', AssetCategory.UI);
    }

    // Mana bar fill
    if (!this.scene.textures.exists('mana-bar')) {
      graphics.fillStyle(0x0088ff);
      graphics.fillRect(0, 0, 100, 10);

      graphics.generateTexture('mana-bar', 100, 10);
      graphics.clear();
      this.registerAsset('mana-bar', AssetCategory.UI);
    }
  }

  private generateMinionTexture(): void {
    // Create a minion enemy texture if it doesn't exist
    if (!this.scene.textures.exists('enemy-minion')) {
      // Create new graphics object
      const graphics = this.scene.make.graphics({});

      // Draw the minion shape - red circular enemy with spikes
      graphics.fillStyle(0xbb0000);
      graphics.fillCircle(50, 50, 40);

      // Add small spikes around the edge
      graphics.fillStyle(0x990000);
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x1 = 50 + Math.cos(angle) * 40;
        const y1 = 50 + Math.sin(angle) * 40;
        const x2 = 50 + Math.cos(angle) * 60;
        const y2 = 50 + Math.sin(angle) * 60;

        graphics.lineStyle(10, 0x990000);
        graphics.lineBetween(x1, y1, x2, y2);
      }

      // Add eyes
      graphics.fillStyle(0xffff00);
      graphics.fillCircle(35, 40, 8);
      graphics.fillCircle(65, 40, 8);

      // Generate texture from graphics
      graphics.generateTexture('enemy-minion', 100, 100);
      graphics.destroy();
    }
  }

  private generateDarkLordTexture(): void {
    // Create a darklord enemy texture if it doesn't exist
    if (!this.scene.textures.exists('enemy-darklord')) {
      // Create new graphics object
      const graphics = this.scene.make.graphics({});

      // Draw the darklord shape - purple wolf-like creature
      graphics.fillStyle(0x6600cc);

      // Wolf body
      graphics.fillCircle(50, 50, 35);

      // Wolf snout
      graphics.fillStyle(0x5500aa);
      graphics.fillTriangle(50, 45, 30, 70, 70, 70);

      // Wolf ears
      graphics.fillStyle(0x7700dd);
      graphics.fillTriangle(30, 30, 25, 5, 40, 25);
      graphics.fillTriangle(70, 30, 75, 5, 60, 25);

      // Eyes - glowing
      graphics.fillStyle(0xff0000);
      graphics.fillCircle(40, 40, 6);
      graphics.fillCircle(60, 40, 6);

      // Highlight in eyes
      graphics.fillStyle(0xff9999);
      graphics.fillCircle(38, 38, 2);
      graphics.fillCircle(58, 38, 2);

      // Generate texture from graphics
      graphics.generateTexture('enemy-darklord', 100, 100);
      graphics.destroy();
    }
  }

  /**
   * Generate a champion texture for the player character (Hero)
   */
  private generateChampionTexture(): void {
    // Create the Hero champion texture if it doesn't exist
    if (!this.scene.textures.exists('hero-champ')) {
      const graphics = this.scene.make.graphics({ x: 0, y: 0 });

      // Champion body (darker blue/purple for Hero)
      graphics.fillStyle(0x8e44ad); // Purple color for Hero
      graphics.fillCircle(50, 50, 40);

      // Face
      graphics.fillStyle(0xf5e8c1); // Skin tone
      graphics.fillCircle(50, 40, 15);

      // Moon symbol on forehead
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(50, 30, 8);
      graphics.fillStyle(0x8e44ad);
      graphics.fillCircle(54, 30, 5);

      // Hair (white/silver)
      graphics.fillStyle(0xe8e8e8);
      graphics.fillRect(30, 15, 40, 15);
      graphics.fillCircle(30, 25, 10);
      graphics.fillCircle(70, 25, 10);

      // Weapon (crescent moon blade)
      graphics.fillStyle(0xe8e8e8); // Silver color
      graphics.fillCircle(85, 30, 12);
      graphics.fillStyle(0x8e44ad); // Purple inner part
      graphics.fillCircle(85, 30, 8);
      graphics.fillStyle(0xe8e8e8); // Silver color
      graphics.fillRect(75, 30, 20, 5);
      graphics.fillRect(85, 20, 5, 25);

      // Armor details
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(35, 50, 8);
      graphics.fillCircle(65, 50, 8);
      graphics.fillRect(45, 60, 10, 25);

      // Generate texture
      graphics.generateTexture('hero-champ', 100, 100);
      graphics.clear();

      // Register asset
      this.registerAsset('hero-champ', AssetCategory.CHAMPION);
    }
  }
}
