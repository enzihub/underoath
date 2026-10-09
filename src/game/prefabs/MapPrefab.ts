// You can write more code here

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
import Enemy from '../objects/Enemy';
import JungleMonster from '../objects/JungleMonster';
/* END-USER-IMPORTS */

export default class MapPrefab extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x?: number, y?: number) {
    super(scene, x ?? 959.999934065371, y ?? 539.999941352351);

    // image_1
    const image_1 = scene.add.image(0.0000070271440790747874, 0.000014180405969455023, 'world_map');
    this.add(image_1);

    /* START-USER-CTR-CODE */
    // Write your code here.
    this.scene = scene;
    // Set minimap parameters
    this.miniMapSize = 200;
    this.miniMapScale = 0.1;
    // this.x = 1200;
    // this.y = 300;

    // Store reference to the map image
    this.miniMapImage = image_1;

    // Set map dimensions for scaling calculations
    this.mapWidth = 3000; // Match the game map width
    this.mapHeight = 3000; // Match the game map height

    // Center the minimap image at origin (0,0)
    this.miniMapImage.setPosition(0, 0);

    // Initialize the minimap elements
    this.initializeMiniMap();

    // Create viewport indicator
    this.viewportIndicator = this.scene.add.rectangle(0, 0, 0, 0);
    this.viewportIndicator.setStrokeStyle(2, 0x00ffff, 1); // Cyan outline
    this.viewportIndicator.setFillStyle(0x00ffff, 0.1); // Slightly visible cyan fill
    this.add(this.viewportIndicator);

    // Add a pulsing effect to the viewport indicator
    this.scene.tweens.add({
      targets: this.viewportIndicator,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // console.log('MapPrefab constructor called and minimap initialized');
    /* END-USER-CTR-CODE */
  }

  public mapWidth: number = 0;
  public mapHeight: number = 0;
  public miniMapSize: number = 0;
  public miniMapScale: number = 0;
  public miniMapContainer!: Phaser.GameObjects.Container;
  public miniMapBg!: Phaser.GameObjects.Rectangle;
  public playerMarker!: Phaser.GameObjects.Arc;
  public mapGraphics!: Phaser.GameObjects.Graphics;
  public monsterMarkers!: Phaser.GameObjects.Arc[];
  public miniMapImage!: Phaser.GameObjects.Image;
  public coordinateText!: Phaser.GameObjects.Text;
  public jungleCampManager!: any;
  public player!: Phaser.GameObjects.Sprite;
  public viewportIndicator!: Phaser.GameObjects.Rectangle;

  /* START-USER-CODE */

  /**
   * Set player reference
   */
  public setPlayer(player: Phaser.GameObjects.Sprite, text: string): void {
    this.player = player;

    // Ensure the player marker is created
    if (this.playerMarker && player) {
      // console.log('Player set for minimap');
    }
  }

  /**
   * Set jungle camp manager reference
   */
  public setJungleCampManager(jungleCampManager: any): void {
    this.jungleCampManager = jungleCampManager;
    // console.log('Jungle camp manager set for minimap');
  }

  /**
   * Convert game coordinates to minimap coordinates
   */
  private gameToMinimapCoords(x: number, y: number): { x: number; y: number } {
    // Scale coordinates based on minimap dimensions
    // Get the width and height of the minimap
    const minimapWidth = this.miniMapImage.width;
    const minimapHeight = this.miniMapImage.height;

    // Calculate the scale factor between game world and minimap
    const scaleX = minimapWidth / this.mapWidth;
    const scaleY = minimapHeight / this.mapHeight;

    // Convert from game coordinates to minimap coordinates
    // The calculation centers the coordinates on the minimap
    const miniX = x * scaleX - minimapWidth / 2;
    const miniY = y * scaleY - minimapHeight / 2;

    return { x: miniX, y: miniY };
  }

  /**
   * Initialize the minimap elements (markers, graphics, etc.)
   */
  private initializeMiniMap() {
    // Add graphics for drawing map elements
    this.mapGraphics = this.scene.add.graphics();
    this.add(this.mapGraphics);

    // Add player marker
    this.playerMarker = this.scene.add.circle(0, 0, 8, 0x00ff00);
    this.add(this.playerMarker);
  }

  // Update the minimap to show current player and monster positions
  update(enemies: Enemy[]) {
    // Clear previous graphics
    this.mapGraphics?.clear();

    // Update player position on minimap if player exists
    if (this.player) {
      const miniPos = this.gameToMinimapCoords(this.player.x, this.player.y);
      this.playerMarker?.setPosition(miniPos.x, miniPos.y);
    }

    // Update viewport indicator
    this.updateViewportIndicator();

    // Draw jungle camps
    enemies.forEach((enemy) => {
      if (!enemy.isDead()) {
        // Calculate minimap position
        const miniPos = this.gameToMinimapCoords(enemy.x, enemy.y);

        // Choose color based on enemy
        const isJungleMonster = enemy instanceof JungleMonster;
        let color = isJungleMonster ? 0xff0000 : 0xffff00; // Red for jungle monsters, yellow for other enemies

        // Draw monster on minimap with larger size for better visibility
        this.mapGraphics?.fillStyle(color, 1);
        this.mapGraphics?.fillCircle(miniPos.x, miniPos.y, 4);
      }
    });

    // Draw jungle camp areas
    this.drawJungleCampAreas();
  }

  /**
   * Update the viewport indicator to show the current camera view
   */
  private updateViewportIndicator() {
    // Get the game scene to access camera
    const gameScene = this.scene.scene.get('Game');

    if (!gameScene) return;

    const camera = gameScene.cameras.main;

    if (!camera) return;

    // Get camera viewport dimensions and position
    const viewportWidth = camera.width;
    const viewportHeight = camera.height;
    const viewportX = camera.scrollX;
    const viewportY = camera.scrollY;

    // Convert camera position to minimap coordinates
    const topLeft = this.gameToMinimapCoords(viewportX, viewportY);
    const bottomRight = this.gameToMinimapCoords(viewportX + viewportWidth, viewportY + viewportHeight);

    // Calculate width and height of viewport rectangle on minimap
    const rectWidth = bottomRight.x - topLeft.x;
    const rectHeight = bottomRight.y - topLeft.y;

    // Update the viewport indicator
    this.viewportIndicator.setPosition(topLeft.x + rectWidth / 2, topLeft.y + rectHeight / 2);
    this.viewportIndicator.setSize(rectWidth, rectHeight);

    // Make sure the viewport indicator is always on top
    this.bringToTop(this.viewportIndicator);
  }

  // Draw jungle camp areas on the minimap
  private drawJungleCampAreas() {
    if (!this.jungleCampManager?.campPositions) return;

    const campPositions = this.jungleCampManager.campPositions;

    // Draw Ember Warden camp area
    if (campPositions.emberWarden) {
      const emberWardenPos = this.gameToMinimapCoords(campPositions.emberWarden.x, campPositions.emberWarden.y);
      this.mapGraphics?.lineStyle(1, 0xff0000, 0.8);
      this.mapGraphics?.strokeCircle(
        emberWardenPos.x,
        emberWardenPos.y,
        10 // Increase radius for better visibility
      );
    }

    // Draw Raptor camp area
    if (campPositions.raptor) {
      const raptorPos = this.gameToMinimapCoords(campPositions.raptor.x, campPositions.raptor.y);
      this.mapGraphics?.lineStyle(1, 0x0000ff, 0.8);
      this.mapGraphics?.strokeCircle(
        raptorPos.x,
        raptorPos.y,
        10 // Increase radius for better visibility
      );
    }

    // Draw Brute camp area
    if (campPositions.brute) {
      const brutePos = this.gameToMinimapCoords(campPositions.brute.x, campPositions.brute.y);
      this.mapGraphics?.lineStyle(1, 0xffff00, 0.8);
      this.mapGraphics?.strokeCircle(
        brutePos.x,
        brutePos.y,
        10 // Increase radius for better visibility
      );
    }
  }

  // Toggle minimap visibility
  toggle() {
    // console.log('Toggling minimap visibility.');
    this.setVisible(!this.visible);
  }

  // Check if minimap is visible
  isVisible(): boolean {
    return this.visible;
  }

  /* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
