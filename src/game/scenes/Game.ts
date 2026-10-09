/* START OF COMPILED CODE */

import * as Phaser from 'phaser';
/* START-USER-IMPORTS */
import { EventBus } from '../EventBus';
import { IGameSettings } from '../types';
import AssetGenerator from '../utils/AssetGenerator';
import EventManager from '../systems/EventManager';
import GameStore from '../systems/GameStore';
import JungleCampManager from '../systems/JungleCampManager';
import Champion from '../objects/Champion';
import Enemy from '../objects/Enemy';
import HUD from './HUD';
import BattleLogPrefab from '../prefabs/BattleLogPrefab';
/* END-USER-IMPORTS */

export default class Game extends Phaser.Scene {
  private player!: Champion;
  private enemies: Enemy[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private abilityKeys!: {
    Q: Phaser.Input.Keyboard.Key;
    W: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    R: Phaser.Input.Keyboard.Key;
  };
  private attackKey!: Phaser.Input.Keyboard.Key;
  private map!: Phaser.GameObjects.Image;
  private gameSettings!: IGameSettings;
  private rangeIndicator!: Phaser.GameObjects.Arc;
  private targetIndicator!: Phaser.GameObjects.Image;
  private mapSize = { width: 3000, height: 3000 };
  private gameStartTime: number = 0;
  private enemiesDefeated: number = 0;
  private gameTimer!: Phaser.Time.TimerEvent;
  private targetedEnemy: Enemy | null = null;
  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private gameConfig = {
    playerSpeed: 350,
    enemySpeed: 50,
    numEnemies: 10,
  };
  private instructionsPanel: Phaser.GameObjects.Container | null = null;
  private isInstructionsVisible: boolean = false;
  private messageLog!: BattleLogPrefab;
  private eventManager: EventManager;
  private gameStore: GameStore;
  private escKey!: Phaser.Input.Keyboard.Key;
  private isPaused: boolean = false;
  private timeSurvived: number = 0;
  private jungleCampManager!: JungleCampManager;

  constructor() {
    super('Game');

    /* START-USER-CTR-CODE */
    this.eventManager = EventManager.getInstance();
    this.gameStore = GameStore.getInstance();
    /* END-USER-CTR-CODE */
  }

  editorCreate(): void {
    // background
    const background = this.add.image(512, 384, 'background');
    background.alpha = 0.5;
    background.visible = false; // Hide default background

    // text
    const text = this.add.text(513, 384, '', {});
    text.setOrigin(0.5, 0.5);
    text.text = 'Make something fun!\nand share it with us:\nsupport@phaser.io';
    text.setStyle({ align: 'center', color: '#ffffff', fontFamily: 'Arial Black', fontSize: '38px', stroke: '#000000', strokeThickness: 8 });
    text.visible = false; // Hide default text

    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */
  init() {
    // Try to load saved key bindings from local storage
    if (typeof localStorage !== 'undefined') {
      const savedSettings = localStorage.getItem('underoath_settings');
      if (savedSettings) {
        try {
          this.gameSettings = JSON.parse(savedSettings);
          console.log('Game scene: Loaded settings from localStorage:', this.gameSettings);
        } catch (error) {
          console.error('Error parsing saved settings:', error);
          this.setDefaultGameSettings();
          console.log('Game scene: Using default settings due to parse error');
        }
      } else {
        this.setDefaultGameSettings();
        console.log('Game scene: No saved settings found, using defaults');
      }
    } else {
      this.setDefaultGameSettings();
      console.log('Game scene: localStorage not available, using defaults');
    }

    // Store settings in registry for access by other scenes
    this.registry.set('gameSettings', this.gameSettings);
    console.log('Game scene: Stored settings in registry');

    // Reset game state
    this.enemies = [];
    this.enemiesDefeated = 0;
    // We'll set gameStartTime in create() when Phaser.time is available

    // Load HUD
    this.scene.launch('HUD', HUD);
  }

  private setDefaultGameSettings() {
    // Default keybindings
    this.gameSettings = {
      keybindings: {
        abilities: {
          Q: Phaser.Input.Keyboard.KeyCodes.ONE,
          W: Phaser.Input.Keyboard.KeyCodes.TWO,
          E: Phaser.Input.Keyboard.KeyCodes.THREE,
          R: Phaser.Input.Keyboard.KeyCodes.FOUR,
        },
        attack: Phaser.Input.Keyboard.KeyCodes.G,
        move: 'RIGHT_CLICK',
      },
      championSpeed: 350,
      showBattleLogs: true,
    };
  }

  preload() {
    // Generate and cache all necessary assets
    const assetGenerator = new AssetGenerator(this);
    assetGenerator.generateAllAssets();

    // Load jungle monsters textures
    this.load.image('hero-sprite', 'assets/images/hero/oathknight.png');
    this.load.image('enemy-emberwarden', 'assets/images/creatures/ember_warden.png');
    this.load.image('enemy-raptor', 'assets/images/creatures/shade_raptor.png');
    this.load.image('enemy-small-raptor', 'assets/images/creatures/shade_raptor.png');
    this.load.image('enemy-brute', 'assets/images/creatures/stone_brute.png');
    this.load.image('enemy-brute-shard', 'assets/images/creatures/stone_brute.png');


    // Load the map image
    this.load.image('world_map', 'assets/images/world_map.jpg');
  }

  create() {
    this.editorCreate();

    // Set the start time using Phaser's time system
    this.gameStartTime = this.time.now;

    // Disable browser's right-click context menu
    this.input.mouse?.disableContextMenu();

    // Create the game map
    this.map = this.add.image(0, 0, 'world_map');
    this.map.setOrigin(0, 0);
    this.map.setDisplaySize(this.mapSize.width, this.mapSize.height);

    // Ensure world bounds match the map size
    this.physics.world.setBounds(0, 0, this.mapSize.width, this.mapSize.height);

    // Create player champion (Hero)
    // console.log(
    // 	'Creating champion with speed:',
    // 	this.gameSettings.championSpeed,
    // );
    const heroTexture = this.textures.exists('hero-sprite') ? 'hero-sprite' : 'hero-champ';
    this.player = new Champion(this, 1300, 200, heroTexture, this.gameSettings.championSpeed);
    if (heroTexture === 'hero-sprite') {
      this.player.setScale(0.3); // 512px painted sprite -> ~150px in world space
    }

    // Create message log system
    this.messageLog = new BattleLogPrefab(this);

    // Explicitly set visibility based on game settings
    this.messageLog.setVisible(this.gameSettings.showBattleLogs);

    // Add initial messages
    this.addInitialMessages();

    // Setup event listeners to log game events
    this.setupEventListeners();

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, this.mapSize.width, this.mapSize.height);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(1);

    // Create range and target indicators
    this.rangeIndicator = this.add.circle(0, 0, 200, 0xffffff, 0.2);
    this.rangeIndicator.setVisible(false);

    this.targetIndicator = this.add.image(0, 0, 'attack-indicator');
    this.targetIndicator.setVisible(false);
    this.targetIndicator.setScale(0.5);

    // Initialize jungle camps manager first without player
    this.jungleCampManager = new JungleCampManager(this);
    // Set player reference after initialization
    this.jungleCampManager.setPlayer(this.player);
    // Create jungle camps
    this.jungleCampManager.createJungleCamps();

    // Add jungle monsters to the enemies array
    const jungleMonsters = this.jungleCampManager.getAllMonsters();
    // Set player reference for all jungle monsters
    jungleMonsters.forEach((monster) => monster.setPlayer(this.player));
    this.enemies.push(...jungleMonsters);

    // Create regular minion enemies
    // Removing this call to keep only jungle camp enemies
    // this.createRegularEnemies();

    // Initialize minimap
    const hudScene = this.scene.get('HUD') as HUD;
    hudScene.initializeMiniMap(this.player, 'Player');
    hudScene.setJungleCampManager(this.jungleCampManager);

    // Setup input
    this.setupInput();

    // Create UI components
    this.createUI();

    // Create instructions panel
    this.createInstructionsPanel();

    // Emit event for scene readiness
    EventBus.emit('current-scene-ready', this);
  }

  update(time: number, delta: number) {
    if (this.isPaused) return;

    // Handle Escape key to toggle main menu
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.toggleMainMenu();
    }

    // Handle camera panning with WASD keys
    this.handleCameraPanning();

    // Update player controls and movement if player exists
    if (this.player && this.player.active) {
      // Handle keyboard movement input
      this.player.update();

      // Handle ability inputs
      this.handleAbilityInputs();

      // Update UI elements with current player info
      this.updateUIInfo();
    }

    // Update all enemies
    this.enemies.forEach((enemy) => {
      if (enemy.active) {
        enemy.update();
      }
    });

    // Clean up dead enemies from the array
    this.cleanupDeadEnemies();

    // Update timer for survival time tracking
    if (this.player && this.player.active) {
      this.timeSurvived = Math.floor((time - this.gameStartTime) / 1000);
    }
  }

  private setupInput() {
    // Create cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create ability hotkeys based on user settings
    const abilityKeyMap = this.gameSettings.keybindings.abilities;
    this.abilityKeys = {
      Q: this.input.keyboard!.addKey(abilityKeyMap.Q),
      W: this.input.keyboard!.addKey(abilityKeyMap.W),
      E: this.input.keyboard!.addKey(abilityKeyMap.E),
      R: this.input.keyboard!.addKey(abilityKeyMap.R),
    };

    // Make sure the ability keys don't trigger browser actions
    this.input.keyboard!.addCapture([
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
    ]);

    // Remove key capture for WASD to avoid conflicts with camera panning
    this.input.keyboard!.removeCapture([
      Phaser.Input.Keyboard.KeyCodes.W,
      Phaser.Input.Keyboard.KeyCodes.A,
      Phaser.Input.Keyboard.KeyCodes.S,
      Phaser.Input.Keyboard.KeyCodes.D,
    ]);

    // Attack key
    this.attackKey = this.input.keyboard!.addKey(this.gameSettings.keybindings.attack);

    // Add escape key for menu
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // Add WASD keys for camera panning
    this.keys.W = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keys.A = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys.S = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keys.D = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // Add right-click for movement
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only process right clicks (button 2)
      if (pointer.rightButtonDown()) {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        // Move the player to the clicked location
        if (this.player && this.player.active) {
          this.player.moveTo(worldPoint.x, worldPoint.y);
        }
      }
    });
  }

  /**
   * Handle camera panning with WASD keys
   */
  private handleCameraPanning() {
    const panSpeed = 20; // Increased panning speed for better usability
    const isAnyPanKeyDown = this.keys.W.isDown || this.keys.A.isDown || this.keys.S.isDown || this.keys.D.isDown;

    // If any pan key is pressed, stop following the player
    if (isAnyPanKeyDown) {
      // Stop camera following the player when manually panning
      this.cameras.main.stopFollow();

      // Pan camera with WASD keys
      if (this.keys.W.isDown) {
        this.cameras.main.scrollY -= panSpeed;
      }
      if (this.keys.A.isDown) {
        this.cameras.main.scrollX -= panSpeed;
      }
      if (this.keys.S.isDown) {
        this.cameras.main.scrollY += panSpeed;
      }
      if (this.keys.D.isDown) {
        this.cameras.main.scrollX += panSpeed;
      }

      // Ensure camera stays within world boundaries
      this.cameras.main.scrollX = Phaser.Math.Clamp(this.cameras.main.scrollX, 0, this.mapSize.width - this.cameras.main.width);
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY, 0, this.mapSize.height - this.cameras.main.height);
    }

    // Add a way to reset camera to follow player - using SPACE key
    if (Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE))) {
      this.cameras.main.startFollow(this.player);
      this.logGameEvent('Camera reset to follow player', '#ffffff');
    }
  }

  // Add more methods from the original GameScene as needed
  // For a complete integration, you would need to add all the other methods
  // such as onEnemyDefeated, checkGameOverConditions, useAbility, etc.

  private createUI() {
    // In a full integration, you would implement the UI creation logic here
    // For now, this is a placeholder
    // console.log("UI created");
  }

  private addInitialMessages() {
    // Add initial game messages
    this.messageLog.addMessage('Welcome to Underoath', '#ffff00');
    this.messageLog.addMessage('Use RIGHT-CLICK to move champion', '#ffffff');
    this.messageLog.addMessage('Use WASD to pan the camera/map', '#ffffff');
    this.messageLog.addMessage('Press SPACE to reset camera to player', '#ffffff');
    this.messageLog.addMessage('Use 1-2-3-4 keys for abilities Q-W-E-R', '#ffffff');
    this.messageLog.addMessage('Press ESC to pause/open menu', '#ffffff');
  }

  private setupEventListeners() {
    // Listen for settings updates
    this.events.on('settings-updated', this.onSettingsUpdated, this);

    // Listen for UI scene events
    const uiScene = this.scene.get('UI');
    if (uiScene) {
      uiScene.events.on('settings-clicked', () => {
        // Launch settings scene when settings button is clicked
        this.scene.launch('Settings', {
          gameSettings: this.registry.get('gameSettings'),
          onClose: (settings: IGameSettings) => {
            // Update registry with new settings
            this.registry.set('gameSettings', settings);
            this.onSettingsUpdated(settings);
          },
        });

        // Pause the game while in settings
        this.scene.pause();
      });
    }

    // Listen for settings updates directly from Settings scene
    this.scene.get('Settings').events.on('settings-updated', this.onSettingsUpdated, this);

    // Setup other event listeners for game events
    // (combat events, player events, etc.)
  }

  private handleAbilityInputs() {
    if (!this.player || !this.player.active) return;

    // Check for Q ability - Shadow Strike
    if (Phaser.Input.Keyboard.JustDown(this.abilityKeys.Q)) {
      // Use Q ability
      this.player.useAbility('Q');
      // Log ability usage
      this.logGameEvent('Used Shadow Strike (Q)', '#00ffff');
    }

    // Check for W ability - Protective Aura
    if (Phaser.Input.Keyboard.JustDown(this.abilityKeys.W)) {
      // Use W ability
      this.player.useAbility('W');
      // Log ability usage
      this.logGameEvent('Used Protective Aura (W)', '#00ffff');
    }

    // Check for E ability - Void Rush
    if (Phaser.Input.Keyboard.JustDown(this.abilityKeys.E)) {
      // Use E ability
      this.player.useAbility('E');
      // Log ability usage
      this.logGameEvent('Used Void Rush (E)', '#00ffff');
    }

    // Check for R ability - Darkfall
    if (Phaser.Input.Keyboard.JustDown(this.abilityKeys.R)) {
      // Use R ability
      this.player.useAbility('R');
      // Log ability usage
      this.logGameEvent('Used Darkfall (R)', '#00ffff');
    }

    // Check for attack key
    if (Phaser.Input.Keyboard.JustDown(this.attackKey)) {
      if (this.player.hasTarget()) {
        this.player.attack();
        this.logGameEvent('Attacking target', '#ffaa00');
      } else {
        // Find closest enemy and set as target
        let closest = this.findClosestEnemy();
        if (closest) {
          this.player.setTarget(closest);
          this.player.attack();
          this.logGameEvent(`Attacking ${closest.getName()}`, '#ffaa00');
        } else {
          this.logGameEvent('No targets in range', '#ff0000');
        }
      }
    }
  }

  /**
   * Find the closest enemy to the player
   */
  private findClosestEnemy(): Enemy | null {
    if (!this.player) return null;

    let closestEnemy: Enemy | null = null;
    let closestDistance = Number.MAX_SAFE_INTEGER;

    this.enemies.forEach((enemy) => {
      if (!enemy.isDead()) {
        const distance = Phaser.Math.Distance.Between(this.player!.x, this.player!.y, enemy.x, enemy.y);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestEnemy = enemy;
        }
      }
    });

    return closestEnemy;
  }

  private createInstructionsPanel() {
    // Create a container for instructions
    this.instructionsPanel = this.add.container(0, 0);
    this.instructionsPanel.setScrollFactor(0); // Fixed to camera

    // Create semi-transparent background
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width - 100,
      this.cameras.main.height - 100,
      0x000000,
      0.8
    );
    bg.setScrollFactor(0);

    // Create title
    const title = this.add.text(this.cameras.main.width / 2, 100, 'GAME CONTROLS', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    title.setScrollFactor(0);

    // Create instructions text
    const instructions = [
      '• Right-click: Move champion to location',
      '• 1: Q Ability - Shadow Strike - Deals damage in an arc',
      '• 2: W Ability - Protective Aura - Shield that detonates on contact',
      '• 3: E Ability - Void Rush - Dash to an enemy',
      '• 4: R Ability - Darkfall - Pull in and damage nearby enemies',
      '• G: Basic attack',
      '• WASD: Pan the camera/map',
      '• SPACE: Reset camera to follow player',
      '• ESC: Open menu',
    ];

    const instructionsText = this.add.text(this.cameras.main.width / 2, 180, instructions, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'left',
    });
    instructionsText.setOrigin(0.5, 0);
    instructionsText.setScrollFactor(0);

    // Create close button
    const closeButton = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 100, 'CLOSE', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#880000',
      padding: { x: 20, y: 10 },
    });
    closeButton.setOrigin(0.5, 0.5);
    closeButton.setScrollFactor(0);
    closeButton.setInteractive({ useHandCursor: true });
    closeButton.on('pointerdown', () => {
      this.toggleInstructions();
    });

    // Add all elements to container
    this.instructionsPanel.add([bg, title, instructionsText, closeButton]);

    // Hide panel initially
    this.instructionsPanel.setVisible(false);
  }

  /**
   * Toggle instructions panel visibility
   */
  private toggleInstructions(): void {
    this.isInstructionsVisible = !this.isInstructionsVisible;
    if (this.instructionsPanel) {
      this.instructionsPanel.setVisible(this.isInstructionsVisible);
    }

    // Pause game when instructions are visible
    if (this.isInstructionsVisible) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
    }
  }

  private updateUIInfo() {
    if (!this.player) return;

    // Just log player health for now
    // console.log('Player Health:', this.player.getHealth(), '/', this.player.getMaxHealth());

    // Update HUD minimap
    const hudScene = this.scene.get('HUD') as HUD;
    if (hudScene) {
      hudScene.updateMinimap(this.enemies);

      // Update ability cooldowns
      ['Q', 'W', 'E', 'R'].forEach((abilityType) => {
        const cooldown = this.player.getAbilityCooldown(abilityType);
        const maxCooldown = this.player.getAbilityMaxCooldown(abilityType);
        const cooldownPercent = maxCooldown > 0 ? cooldown / maxCooldown : 0;
        hudScene.updateAbilityCooldown(abilityType, cooldownPercent);
      });
    }
  }

  private cleanupDeadEnemies() {
    // Filter out dead enemies from the array
    const deadEnemies = this.enemies.filter((enemy) => enemy.isDead() && !enemy.isMarkedForRespawn());

    // Remove dead enemies that are not marked for respawn
    this.enemies = this.enemies.filter((enemy) => !enemy.isDead() || enemy.isMarkedForRespawn());

    // Update enemy count
    this.enemiesDefeated += deadEnemies.length;

    // Log enemy defeats
    deadEnemies.forEach((enemy) => {
      this.logGameEvent(`Defeated ${enemy.getName()}!`, '#ff00ff');
    });
  }

  private toggleMainMenu() {
    // Toggle the main menu
    // This is a placeholder for the full implementation
    this.scene.pause();
    this.scene.launch('MainMenu');
  }

  /**
   * Log a game event message to the message log
   */
  logGameEvent(message: string, color: string = '#FFFFFF'): void {
    if (this.messageLog) {
      this.messageLog.addMessage(message, color);
    }
  }

  changeScene() {
    this.scene.start('GameOver');
  }

  getEnemies(): Enemy[] {
    return this.enemies;
  }

  public getPlayer(): Champion | null {
    return this.player;
  }

  /**
   * Get the jungle camp manager
   */
  public getJungleCampManager() {
    return this.jungleCampManager;
  }

  /**
   * Handle updates to game settings
   */
  private onSettingsUpdated(settings: IGameSettings): void {
    // console.log('Applying updated settings:', settings);

    // Update local settings reference
    this.gameSettings = settings;

    // Apply champion speed change
    if (this.player) {
      this.player.setMoveSpeed(settings.championSpeed);
    }

    // Update message log visibility
    if (this.messageLog) {
      this.messageLog.setVisible(settings.showBattleLogs);
    }

    // Rebind keyboard keys based on new keybindings
    this.updateKeyBindings(settings.keybindings);

    // Relay settings to HUD scene for immediate UI updates
    const hudScene = this.scene.get('HUD');
    if (hudScene && hudScene.events) {
      hudScene.events.emit('settings-updated', settings);
    }
  }

  /**
   * Update key bindings based on settings
   */
  private updateKeyBindings(keybindings: IGameSettings['keybindings']): void {
    // Remove old key bindings
    if (this.abilityKeys) {
      Object.values(this.abilityKeys).forEach((key) => {
        this.input.keyboard?.removeCapture(key.keyCode);
      });
    }

    if (this.attackKey) {
      this.input.keyboard?.removeCapture(this.attackKey.keyCode);
    }

    // Create ability hotkeys based on user settings
    this.abilityKeys = {
      Q: this.input.keyboard!.addKey(keybindings.abilities.Q),
      W: this.input.keyboard!.addKey(keybindings.abilities.W),
      E: this.input.keyboard!.addKey(keybindings.abilities.E),
      R: this.input.keyboard!.addKey(keybindings.abilities.R),
    };

    // Attack key
    this.attackKey = this.input.keyboard!.addKey(keybindings.attack);
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
