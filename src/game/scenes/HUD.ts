// You can write more code here

/* START OF COMPILED CODE */

import MapPrefab from "../prefabs/MapPrefab";
import BattleLogPrefab from "../prefabs/BattleLogPrefab";
/* START-USER-IMPORTS */
import Game from './Game';
import Enemy from '../objects/Enemy';
import { GameEvents } from '../systems/EventManager';
import EventManager from '../systems/EventManager';
/* END-USER-IMPORTS */

export default class HUD extends Phaser.Scene {

	constructor() {
		super("HUD");

		/* START-USER-CTR-CODE */

    /* END-USER-CTR-CODE */
	}

	editorCreate(): void {

		// text_3
		const text_3 = this.add.text(1809, 43, "", {});
		text_3.setInteractive(new Phaser.Geom.Rectangle(0, 0, 154, 32.859375), Phaser.Geom.Rectangle.Contains);
		text_3.setOrigin(0.5, 0.5);
		text_3.text = "Settings";
		text_3.setStyle({ "fontSize": "32px" });

		// text_4
		const text_4 = this.add.text(1852.5, 1063.5703125, "", {});
		text_4.setOrigin(0.5, 0.5);
		text_4.text = "MiniMap";
		text_4.setStyle({ "fontSize": "32px" });

		// mapPrefab
		const mapPrefab = new MapPrefab(this, 1764.5243764924585, 924.5243971690098);
		this.add.existing(mapPrefab);
		mapPrefab.scaleX = 0.38868895443315943;
		mapPrefab.scaleY = 0.38868895443315943;

		// battleLogPrefab
		const battleLogPrefab = new BattleLogPrefab(this, 1767.7573458611453, 258);
		this.add.existing(battleLogPrefab);
		battleLogPrefab.scaleX = 0.9352305263567248;
		battleLogPrefab.scaleY = 0.9352305263567248;

		// playerStats
		const playerStats = this.add.container(831.1482839538896, 1038.415614180486);

		// healthBar
		const healthBar = this.add.rectangle(0, 38, 128, 128);
		healthBar.scaleX = 2.0133080632204736;
		healthBar.scaleY = 0.05600602842990636;
		healthBar.setOrigin(0, 0.5);
		healthBar.isFilled = true;
		playerStats.add(healthBar);

		// abilityQ
		const abilityQ = this.add.rectangle(32.851715087890625, 0, 128, 128);
		abilityQ.scaleX = 0.44232190440010744;
		abilityQ.scaleY = 0.44232190440010744;
		abilityQ.isFilled = true;
		playerStats.add(abilityQ);

		// abilityW
		const abilityW = this.add.rectangle(94.85171508789062, 0, 128, 128);
		abilityW.scaleX = 0.44232190440010744;
		abilityW.scaleY = 0.44232190440010744;
		abilityW.isFilled = true;
		playerStats.add(abilityW);

		// abilityE
		const abilityE = this.add.rectangle(157.85171508789062, 0, 128, 128);
		abilityE.scaleX = 0.44232190440010744;
		abilityE.scaleY = 0.44232190440010744;
		abilityE.isFilled = true;
		playerStats.add(abilityE);

		// abilityR
		const abilityR = this.add.rectangle(219.85171508789062, 0, 128, 128);
		abilityR.scaleX = 0.44232190440010744;
		abilityR.scaleY = 0.44232190440010744;
		abilityR.isFilled = true;
		playerStats.add(abilityR);

		this.text_3 = text_3;
		this.mapPrefab = mapPrefab;
		this.healthBar = healthBar;
		this.abilityQ = abilityQ;
		this.abilityW = abilityW;
		this.abilityE = abilityE;
		this.abilityR = abilityR;

		this.events.emit("scene-awake");
	}

	private text_3!: Phaser.GameObjects.Text;
	private mapPrefab!: MapPrefab;
	private healthBar!: Phaser.GameObjects.Rectangle;
	private abilityQ!: Phaser.GameObjects.Rectangle;
	private abilityW!: Phaser.GameObjects.Rectangle;
	private abilityE!: Phaser.GameObjects.Rectangle;
	private abilityR!: Phaser.GameObjects.Rectangle;

	/* START-USER-CODE */

  private originalHealthBarWidth: number;
  // Add cooldown overlays for abilities
  private qCooldownOverlay: Phaser.GameObjects.Rectangle;
  private wCooldownOverlay: Phaser.GameObjects.Rectangle;
  private eCooldownOverlay: Phaser.GameObjects.Rectangle;
  private rCooldownOverlay: Phaser.GameObjects.Rectangle;

  public eventManager = EventManager.getInstance();

  public updateHealthBar(health: number, maxHealth: number): void {
    const healthPercentage = health / maxHealth;
    console.log('healthPercentage', healthPercentage);

    // Use the original width instead of the current width
    const newWidth = this.originalHealthBarWidth * healthPercentage;
    console.log('originalWidth', this.originalHealthBarWidth);
    console.log('newWidth', newWidth);

    this.healthBar.setSize(newWidth, this.healthBar.height);
  }

  /**
   * Update ability cooldown visuals
   * @param abilityType Ability type (Q, W, E, R)
   * @param cooldownPercent Percentage of cooldown remaining (0-1)
   */
  public updateAbilityCooldown(abilityType: string, cooldownPercent: number): void {
    let ability: Phaser.GameObjects.Rectangle;
    let cooldownOverlay: Phaser.GameObjects.Rectangle;

    // Determine which ability to update
    switch (abilityType) {
      case 'Q':
        ability = this.abilityQ;
        cooldownOverlay = this.qCooldownOverlay;
        break;
      case 'W':
        ability = this.abilityW;
        cooldownOverlay = this.wCooldownOverlay;
        break;
      case 'E':
        ability = this.abilityE;
        cooldownOverlay = this.eCooldownOverlay;
        break;
      case 'R':
        ability = this.abilityR;
        cooldownOverlay = this.rCooldownOverlay;
        break;
      default:
        return;
    }

    // Update the cooldown overlay
    if (cooldownPercent > 0) {
      // Make sure the overlay is visible
      cooldownOverlay.setVisible(true);

      // Set the height of the overlay based on the cooldown percentage
      // We're filling from bottom to top, so height is the percent remaining
      const height = ability.height * ability.scaleY * cooldownPercent;
      cooldownOverlay.setSize(ability.width * ability.scaleX, height);

      // Position the overlay at the bottom of the ability
      const yOffset = (ability.height * ability.scaleY - height) / 2;
      cooldownOverlay.setPosition(ability.x, ability.y - yOffset);
    } else {
      // Hide the overlay when cooldown is complete
      cooldownOverlay.setVisible(false);
    }
  }

  public initializeMiniMap(player: Phaser.GameObjects.Sprite, text: string) {
    // Set player reference on MapPrefab
    this.mapPrefab.setPlayer(player, text);
    // console.log('HUD: Player set for minimap');

    // Try to get the jungle camp manager from the Game scene
    const gameScene = this.scene.get('Game') as Game;
    if (gameScene && gameScene.getJungleCampManager) {
      this.setJungleCampManager(gameScene.getJungleCampManager());
    } else {
      console.warn('Jungle camp manager not available in Game scene');
    }
  }

  public setJungleCampManager(jungleCampManager: any) {
    // Set jungle camp manager on MapPrefab
    this.mapPrefab.setJungleCampManager(jungleCampManager);
    // console.log('HUD: Jungle camp manager set for minimap');
  }

  /**
   * Update the minimap with current enemies
   * @param enemies Array of enemies to display on the minimap
   */
  public updateMinimap(enemies: Enemy[]): void {
    if (this.mapPrefab) {
      this.mapPrefab.update(enemies);
    }
  }

  // Adjust the UI elements dynamically based on the window size.
  // The reference size is 1024x768. Based on this size, the UI elements are positioned.
  // This function scales the UI elements based on the current window size.

  create() {
    this.editorCreate();

    // Border resize
    // this.scale.resize(1920,1080);
    // const player = this.scene.get('Game')..getPlayer();
    // Get player from Game scene

    this.text_3.on('pointerdown', () => {
      this.scene.launch('Settings');
    });

    // Find the battle log component and make sure its visibility matches the current settings
    const gameSettings = this.registry.get('gameSettings');
    if (gameSettings) {
      // Find all BattleLogPrefab instances
      const battleLogComponents = this.children.list.filter((child) => child instanceof BattleLogPrefab) as BattleLogPrefab[];

      // Update visibility based on settings
      battleLogComponents.forEach((battleLog) => {
        battleLog.setVisible(gameSettings.showBattleLogs);
      });
    }

    this.subscribeToEvents();
    this.originalHealthBarWidth = this.healthBar.width;

    // Ability slots: dark violet tiles with a coloured rim and the key letter
    const slotStyle: Array<[Phaser.GameObjects.Rectangle, string, number]> = [
      [this.abilityQ, 'Q', 0x8b5cf6],
      [this.abilityW, 'W', 0x38bdf8],
      [this.abilityE, 'E', 0xa78bfa],
      [this.abilityR, 'R', 0xf59e0b],
    ];
    slotStyle.forEach(([slot, key, rim]) => {
      slot.fillColor = 0x1c1530;
      slot.setStrokeStyle(6, rim, 1);
      const label = this.add.text(slot.x, slot.y, key, {
        fontFamily: 'Georgia, serif',
        fontSize: '30px',
        color: '#efe9ff',
        stroke: '#000000',
        strokeThickness: 4,
      });
      label.setOrigin(0.5, 0.5);
      slot.parentContainer.add(label);
    });

    // Create cooldown overlays for abilities
    this.createCooldownOverlays();
  }

  /**
   * Create the cooldown overlay rectangles
   */
  private createCooldownOverlays(): void {
    // Get parent container of abilities
    const parentContainer = this.abilityQ.parentContainer;

    // Create Q ability cooldown overlay
    this.qCooldownOverlay = this.add.rectangle(
      this.abilityQ.x,
      this.abilityQ.y,
      this.abilityQ.width * this.abilityQ.scaleX,
      this.abilityQ.height * this.abilityQ.scaleY,
      0x000000,
      0.7
    );
    this.qCooldownOverlay.setVisible(false);
    parentContainer.add(this.qCooldownOverlay);

    // Create W ability cooldown overlay
    this.wCooldownOverlay = this.add.rectangle(
      this.abilityW.x,
      this.abilityW.y,
      this.abilityW.width * this.abilityW.scaleX,
      this.abilityW.height * this.abilityW.scaleY,
      0x000000,
      0.7
    );
    this.wCooldownOverlay.setVisible(false);
    parentContainer.add(this.wCooldownOverlay);

    // Create E ability cooldown overlay
    this.eCooldownOverlay = this.add.rectangle(
      this.abilityE.x,
      this.abilityE.y,
      this.abilityE.width * this.abilityE.scaleX,
      this.abilityE.height * this.abilityE.scaleY,
      0x000000,
      0.7
    );
    this.eCooldownOverlay.setVisible(false);
    parentContainer.add(this.eCooldownOverlay);

    // Create R ability cooldown overlay
    this.rCooldownOverlay = this.add.rectangle(
      this.abilityR.x,
      this.abilityR.y,
      this.abilityR.width * this.abilityR.scaleX,
      this.abilityR.height * this.abilityR.scaleY,
      0x000000,
      0.7
    );
    this.rCooldownOverlay.setVisible(false);
    parentContainer.add(this.rCooldownOverlay);
  }

  update() {
    // Get enemies from the Game scene to update the minimap
    const gameScene = this.scene.get('Game') as Game;
    if (gameScene && gameScene.getEnemies) {
      const enemies = gameScene.getEnemies();
      this.mapPrefab.update(enemies);
    }

    // Update ability cooldowns from the Game scene
    if (gameScene && gameScene.getPlayer) {
      const player = gameScene.getPlayer();
      if (player) {
        // Update each ability cooldown
        ['Q', 'W', 'E', 'R'].forEach((abilityType) => {
          const cooldown = player.getAbilityCooldown(abilityType);
          const maxCooldown = player.getAbilityMaxCooldown(abilityType);
          const cooldownPercent = maxCooldown > 0 ? cooldown / maxCooldown : 0;
          this.updateAbilityCooldown(abilityType, cooldownPercent);
        });
      }
    }
  }

  private subscribeToEvents(): void {
    // Player damage events
    this.eventManager.on(
      GameEvents.PLAYER_DAMAGED,
      (amount: number, health: number, maxHealth: number) => {
        // max 675
        console.log('PLAYER_DAMAGED', amount, health, maxHealth); // 25 650

        // Pass the actual health and maxHealth values to updateHealthBar
        this.updateHealthBar(health, maxHealth);
      },
      this
    );

    // Subscribe to ability used events to update cooldown UI
    this.eventManager.on(
      GameEvents.ABILITY_USED,
      (abilityType: string) => {
        // When an ability is used, we'll get the cooldown from the player
        const gameScene = this.scene.get('Game') as Game;
        if (gameScene && gameScene.getPlayer) {
          const player = gameScene.getPlayer();
          if (player) {
            const cooldown = player.getAbilityCooldown(abilityType);
            const maxCooldown = player.getAbilityMaxCooldown(abilityType);
            const cooldownPercent = maxCooldown > 0 ? cooldown / maxCooldown : 0;
            this.updateAbilityCooldown(abilityType, cooldownPercent);
          }
        }
      },
      this
    );

    // Listen for settings changes to update UI accordingly
    this.events.on('settings-updated', (settings: any) => {
      console.log('HUD received settings-updated', settings);

      // Find all BattleLogPrefab instances in the scene
      const battleLogComponents = this.children.list.filter((child) => child instanceof BattleLogPrefab) as BattleLogPrefab[];

      // Update visibility of all battle log components
      battleLogComponents.forEach((battleLog) => {
        battleLog.setVisible(settings.showBattleLogs);
      });
    });

    /* END-USER-CODE */
}

/* END OF COMPILED CODE */

  // You can write more code here
}
