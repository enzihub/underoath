/* START OF COMPILED CODE */

import * as Phaser from 'phaser';
/* START-USER-IMPORTS */
import { IGameSettings } from '../types';
import { EventBus } from '../EventBus';
/* END-USER-IMPORTS */

export default class Settings extends Phaser.Scene {
  // Game settings
  private gameSettings!: IGameSettings;
  private onClose!: (settings: IGameSettings) => void;

  // UI elements
  private panelWidth!: number;
  private panelHeight!: number;
  private panelX!: number;
  private panelY!: number;
  private buttons: { [key: string]: Phaser.GameObjects.Text } = {};
  private listeningForKey: string | null = null;
  private resetButton!: Phaser.GameObjects.Text;
  private closeButton!: Phaser.GameObjects.Text;
  private toggleBattleLogsButton!: Phaser.GameObjects.Text;

  // Slider elements
  private speedSlider!: Phaser.GameObjects.Graphics;
  private speedSliderHandle!: Phaser.GameObjects.Arc;
  private speedHandleHighlight!: Phaser.GameObjects.Arc;
  private speedText!: Phaser.GameObjects.Text;
  private isDraggingSlider: boolean = false;

  constructor() {
    super('Settings');

    /* START-USER-CTR-CODE */
    // console.log('Settings constructor called');
    /* END-USER-CTR-CODE */
  }

  editorCreate(): void {
    // This is where the Phaser Editor would add scene elements
    // We'll create our UI elements programmatically in the create method

    this.events.emit('scene-awake');
  }

  /* START-USER-CODE */
  init(data: { gameSettings?: IGameSettings; onClose?: (settings: IGameSettings) => void }) {
    // Try multiple sources for game settings in order of preference:
    // 1. Directly provided in data
    // 2. From scene registry
    // 3. From localStorage
    // 4. Default settings as fallback

    let settings: IGameSettings | null = null;

    // 1. Check if directly provided in data
    if (data.gameSettings) {
      settings = JSON.parse(JSON.stringify(data.gameSettings)); // Deep copy
    }
    // 2. Check scene registry
    else if (this.registry.has('gameSettings')) {
      settings = JSON.parse(JSON.stringify(this.registry.get('gameSettings'))); // Deep copy
    }
    // 3. Check localStorage
    else if (typeof window !== 'undefined') {
      const storedSettings = localStorage.getItem('underoath_settings');
      if (storedSettings) {
        try {
          settings = JSON.parse(storedSettings);
        } catch (e) {
          console.error('Failed to parse stored settings:', e);
        }
      }
    }

    // 4. Fall back to defaults if no valid settings found
    this.gameSettings = settings || this.getDefaultSettings();

    // Store initial settings in registry for other scenes to access
    this.registry.set('gameSettings', this.gameSettings);

    // Setup callback for when settings are closed
    this.onClose =
      data.onClose ||
      ((settings: IGameSettings) => {
        // If no callback provided, update registry and save to localStorage by default
        this.registry.set('gameSettings', settings);
        if (typeof window !== 'undefined') {
          localStorage.setItem('underoath_settings', JSON.stringify(settings));
        }
        // Emit an event so the game scene can update
        this.events.emit('settings-updated', settings);
      });

    // console.log('Settings initialized:', this.gameSettings);
  }

  create() {
    this.editorCreate();

    const { width, height } = this.scale;

    // Ensure this scene is on top
    this.scene.bringToTop();

    // console.log('=== SETTINGS SCENE CREATE STARTED ===');
    // console.log(`Screen dimensions: ${width}x${height}`);

    // Clear any existing elements
    this.children.removeAll(true);

    // Define a consistent high depth value for all settings elements
    const baseDepth = 1000;

    // Semi-transparent background overlay that covers the entire screen
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0, 0).setInteractive().setDepth(baseDepth);

    // Calculate panel size based on screen dimensions (responsive)
    this.panelWidth = Math.min(580, width * 0.8);
    this.panelHeight = Math.min(580, height * 0.8);
    this.panelX = width / 2 - this.panelWidth / 2;
    this.panelY = height / 2 - this.panelHeight / 2;

    // Store the base depth for other elements to use
    this.registry.set('settingsDepth', baseDepth);

    // Create the main panel
    this.createMainPanel();

    // Create UI Sections using flex-like layout
    this.createFlexLayout();

    // Listen for keyboard input to capture new keybindings
    this.input.keyboard!.on('keydown', this.handleKeyDown, this);

    // Add ESC key handling to cancel or close
    this.input.keyboard!.on(
      'keydown-ESC',
      () => {
        if (this.listeningForKey) {
          this.cancelKeyBinding();
        } else {
          this.saveSettings();
          this.scene.stop();
        }
      },
      this
    );

    // console.log('Settings scene created with dimensions:', width, 'x', height);
    // console.log(
    // 	'Panel dimensions:',
    // 	this.panelWidth,
    // 	'x',
    // 	this.panelHeight,
    // 	'at position',
    // 	this.panelX,
    // 	',',
    // 	this.panelY,
    // );
    // console.log('=== SETTINGS SCENE CREATE FINISHED ===');

    // Notify that the scene is ready
    EventBus.emit('current-scene-ready', this);
  }

  private createMainPanel() {
    // Get the base depth for settings elements
    const baseDepth = this.registry.get('settingsDepth') || 1000;

    // Create panel background with modern glass-morphism effect
    const panelBg = this.add.graphics();
    // Fill with dark purple/blue background
    panelBg.fillStyle(0x13111c, 0.9);
    panelBg.fillRoundedRect(
      this.panelX,
      this.panelY,
      this.panelWidth,
      this.panelHeight,
      20 // Larger corner radius for modern look
    );

    // Add subtle border
    panelBg.lineStyle(2, 0x7b2cbf, 0.7);
    panelBg.strokeRoundedRect(this.panelX, this.panelY, this.panelWidth, this.panelHeight, 20);

    // Add inner highlight for glass effect
    panelBg.lineStyle(1, 0xffffff, 0.1);
    panelBg.strokeRoundedRect(this.panelX + 3, this.panelY + 3, this.panelWidth - 6, this.panelHeight - 6, 17);

    // Ensure all settings elements have high depth
    panelBg.setDepth(baseDepth + 1);
  }

  private createFlexLayout() {
    // Get the base depth for settings elements
    const baseDepth = this.registry.get('settingsDepth') || 1000;

    const paddingX = this.panelWidth * 0.07; // Horizontal padding (7% of panel width)
    const paddingY = this.panelHeight * 0.05; // Vertical padding (5% of panel height)

    // Calculate available space after padding
    const availableWidth = this.panelWidth - paddingX * 2;
    const availableHeight = this.panelHeight - paddingY * 2;

    // Calculate element positions and sizes with flex-like ratios
    // Header: 12% of available height
    const headerHeight = availableHeight * 0.12;
    const headerY = this.panelY + paddingY;

    // Keybindings: 40% of available height
    const keybindingsHeight = availableHeight * 0.4;
    const keybindingsY = headerY + headerHeight + paddingY * 0.5;

    // Champion settings: 30% of available height
    const championSettingsHeight = availableHeight * 0.3;
    const championSettingsY = keybindingsY + keybindingsHeight + paddingY * 0.5;

    // Footer: remaining height (~13%)
    const footerHeight = availableHeight - (headerHeight + keybindingsHeight + championSettingsHeight + paddingY * 1.5);
    const footerY = championSettingsY + championSettingsHeight + paddingY * 0.5;

    // Create sections
    this.createHeaderSection(this.panelX + paddingX, headerY, availableWidth, headerHeight, baseDepth + 2);

    this.createKeybindingSection(this.panelX + paddingX, keybindingsY, availableWidth, keybindingsHeight, baseDepth + 2);

    this.createChampionSettingsSection(this.panelX + paddingX, championSettingsY, availableWidth, championSettingsHeight, baseDepth + 2);

    this.createFooterSection(this.panelX + paddingX, footerY, availableWidth, footerHeight, baseDepth + 2);
  }

  private createHeaderSection(x: number, y: number, width: number, height: number, depth: number) {
    // Title
    this.add
      .text(x + width / 2, y + height / 2, 'GAME SETTINGS', {
        fontSize: '28px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 0.5)
      .setDepth(depth);

    // Add divider
    this.createDivider(x, y + height, width, 0x7b2cbf, depth);
  }

  private createKeybindingSection(x: number, y: number, width: number, height: number, depth: number) {
    // Section title
    this.add
      .text(x, y, 'KEYBINDINGS', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#9a67ea',
      })
      .setOrigin(0, 0)
      .setDepth(depth);

    // Layout constants
    const startY = y + 40;
    const buttonHeight = 40;
    const buttonSpacing = 15;
    const buttonWidth = 100;
    const labelWidth = 130;
    const totalWidth = width;

    // Keybinding pairs (label + button)
    const keybindings = [
      { label: 'Q Ability', key: 'Q' },
      { label: 'W Ability', key: 'W' },
      { label: 'E Ability', key: 'E' },
      { label: 'R Ability', key: 'R' },
      { label: 'Attack:', key: 'attack' },
    ];

    // Calculate layout based on number of keybindings
    // 2 columns if we have more than 3 keybindings
    const columns = keybindings.length > 3 ? 2 : 1;
    const itemsPerColumn = Math.ceil(keybindings.length / columns);
    const columnWidth = totalWidth / columns;

    keybindings.forEach((binding, index) => {
      const column = Math.floor(index / itemsPerColumn);
      const row = index % itemsPerColumn;

      const keyX = x + column * columnWidth + labelWidth;
      const keyY = startY + row * (buttonHeight + buttonSpacing);

      // Add label
      this.add
        .text(keyX - 10, keyY + buttonHeight / 2, binding.label, {
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
        })
        .setOrigin(1, 0.5)
        .setDepth(depth);

      // Handle different types of key bindings
      if (binding.key === 'attack') {
        // For attack, use the direct key code
        this.createKeyButton(keyX, keyY, this.getKeyName(this.gameSettings.keybindings.attack), 'attack', buttonHeight, buttonWidth, depth);
      } else {
        // For abilities, access them through the abilities object
        const keyCode = this.gameSettings.keybindings.abilities[binding.key as keyof typeof this.gameSettings.keybindings.abilities];
        this.createKeyButton(keyX, keyY, this.getKeyName(keyCode), binding.key, buttonHeight, buttonWidth, depth);
      }
    });

    // Add divider at the bottom
    this.createDivider(x, y + height, width, 0x7b2cbf, depth);
  }

  private createChampionSettingsSection(x: number, y: number, width: number, height: number, depth: number) {
    // Section title
    this.add
      .text(x, y, 'CHAMPION SETTINGS', {
        fontSize: '22px',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
        color: '#9a67ea',
      })
      .setOrigin(0, 0)
      .setDepth(depth);

    // Movement speed slider
    this.createChampionSpeedSlider(x, y + 50, width, depth);

    // Battle logs toggle
    this.createBattleLogsToggle(x, y + 110, width, depth);

    // Add divider at the bottom
    this.createDivider(x, y + height, width, 0x7b2cbf, depth);
  }

  private createChampionSpeedSlider(x: number, y: number, width: number, depth: number) {
    // Label
    this.add
      .text(x, y, 'Movement Speed:', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth);

    // Current speed text
    this.speedText = this.add
      .text(x + width, y, `${this.gameSettings.championSpeed}`, {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#9a67ea',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setDepth(depth);

    // Slider configuration
    const sliderY = y + 25;
    const sliderHeight = 8;
    const sliderWidth = width;
    const handleRadius = 12;
    const handleHighlightRadius = 15;

    // Min and max speed values
    const minSpeed = 200;
    const maxSpeed = 500;

    // Handle position based on current speed
    const normalizedSpeed = (this.gameSettings.championSpeed - minSpeed) / (maxSpeed - minSpeed);
    const handleX = x + normalizedSpeed * sliderWidth;

    // Create slider track background
    this.speedSlider = this.add.graphics().setDepth(depth);
    // Background track
    this.speedSlider.fillStyle(0x1d1d2b, 1);
    this.speedSlider.fillRect(x, sliderY - sliderHeight / 2, sliderWidth, sliderHeight);
    this.speedSlider.fillStyle(0x3c3c50, 1);
    this.speedSlider.fillRect(x, sliderY - sliderHeight / 2, sliderWidth * normalizedSpeed, sliderHeight);

    // Slider handle highlight (larger circle behind handle for visual effect)
    this.speedHandleHighlight = this.add.circle(handleX, sliderY, handleHighlightRadius, 0x9a67ea, 0.3).setDepth(depth + 1);

    // Slider handle
    this.speedSliderHandle = this.add
      .circle(handleX, sliderY, handleRadius, 0x9a67ea, 1)
      .setDepth(depth + 2)
      .setInteractive({ draggable: true });

    // Make both the slider track and handle interactive
    this.speedSlider.setInteractive(new Phaser.Geom.Rectangle(x, sliderY - 15, sliderWidth, 30), Phaser.Geom.Rectangle.Contains);

    // Slider track click event
    this.speedSlider.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Calculate new handle position and speed
      this.updateSliderPosition(pointer.x, x, sliderWidth, minSpeed, maxSpeed);
    });

    // Handle drag events
    this.speedSliderHandle.on('pointerdown', () => {
      this.isDraggingSlider = true;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingSlider && pointer.isDown) {
        // Update slider position during drag
        this.updateSliderPosition(pointer.x, x, sliderWidth, minSpeed, maxSpeed);
      }
    });

    this.input.on('pointerup', () => {
      this.isDraggingSlider = false;
    });
  }

  private createBattleLogsToggle(x: number, y: number, width: number, depth: number) {
    // Label
    this.add
      .text(x, y, 'Show Battle Logs:', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
      .setDepth(depth);

    // Toggle button
    const toggleWidth = 70;
    const toggleHeight = 36;
    const toggleX = x + width - toggleWidth;

    // Create the toggle background
    const toggleBackground = this.add.graphics().setDepth(depth);
    const toggleColor = this.gameSettings.showBattleLogs ? 0x38b000 : 0x444444;
    toggleBackground.fillStyle(toggleColor, 1);
    toggleBackground.fillRoundedRect(toggleX, y - toggleHeight / 2, toggleWidth, toggleHeight, toggleHeight / 2);

    // Add toggle button (circle) on the appropriate side
    const circleRadius = toggleHeight * 0.36;
    const circleOffset = this.gameSettings.showBattleLogs ? toggleWidth - circleRadius * 2 - 4 : 4;
    const toggleCircle = this.add.circle(toggleX + circleRadius + circleOffset, y, circleRadius, 0xffffff, 1).setDepth(depth + 1);

    // Store the toggle components for later updates
    const toggleComponents = {
      background: toggleBackground,
      circle: toggleCircle,
      x: toggleX,
      y,
      width: toggleWidth,
      height: toggleHeight,
    };

    // Make the toggle button interactive
    toggleBackground.setInteractive(
      new Phaser.Geom.Rectangle(toggleX, y - toggleHeight / 2, toggleWidth, toggleHeight),
      Phaser.Geom.Rectangle.Contains
    );
    toggleCircle.setInteractive();

    // Toggle behavior
    const toggleClick = () => {
      // Toggle the state
      this.gameSettings.showBattleLogs = !this.gameSettings.showBattleLogs;
      this.updateBattleLogsToggle(toggleComponents);

      // We no longer emit settings-updated event here
      // Changes will only be applied when Save & Close is clicked
    };

    toggleBackground.on('pointerdown', toggleClick);
    toggleCircle.on('pointerdown', toggleClick);

    // Store the toggle button reference
    this.toggleBattleLogsButton = toggleCircle as any;
  }

  private updateBattleLogsToggle(components: any) {
    // Update toggle colors and position based on current state
    const { background, circle, x, y, width, height } = components;

    // Clear the existing graphics
    background.clear();

    // Draw new background with appropriate color
    const toggleColor = this.gameSettings.showBattleLogs ? 0x38b000 : 0x444444;
    background.fillStyle(toggleColor, 1);
    background.fillRoundedRect(x, y - height / 2, width, height, height / 2);

    // Move the circle to the appropriate side
    const circleRadius = height * 0.36;
    const circleOffset = this.gameSettings.showBattleLogs ? width - circleRadius * 2 - 4 : 4;
    circle.x = x + circleRadius + circleOffset;
  }

  private updateSliderPosition(pointerX: number, sliderX: number, sliderWidth: number, minSpeed: number, maxSpeed: number) {
    // Calculate the normalized position (0-1)
    let normalizedPosition = (pointerX - sliderX) / sliderWidth;
    normalizedPosition = Phaser.Math.Clamp(normalizedPosition, 0, 1);

    // Calculate the new speed value
    const newSpeed = Math.round(minSpeed + normalizedPosition * (maxSpeed - minSpeed));

    // Update the slider graphics
    this.updateChampionSpeed(newSpeed);

    // Calculate the new handle position
    const handleX = sliderX + normalizedPosition * sliderWidth;

    // Update handle positions
    this.speedSliderHandle.x = handleX;
    this.speedHandleHighlight.x = handleX;

    // Update the slider fill
    this.speedSlider.clear();
    // Background track
    this.speedSlider.fillStyle(0x1d1d2b, 1);
    this.speedSlider.fillRect(sliderX, this.speedSliderHandle.y - 4, sliderWidth, 8);
    // Filled part
    this.speedSlider.fillStyle(0x3c3c50, 1);
    this.speedSlider.fillRect(sliderX, this.speedSliderHandle.y - 4, sliderWidth * normalizedPosition, 8);
  }

  private updateChampionSpeed(speed: number) {
    // Update the speed in settings
    this.gameSettings.championSpeed = speed;

    // Update the text display
    if (this.speedText) {
      this.speedText.setText(`${speed}`);
    }

    // We no longer emit settings-updated event here
    // Changes will only be applied when Save & Close is clicked
  }

  private createFooterSection(x: number, y: number, width: number, height: number, depth: number) {
    // Create buttons container for better organization
    const buttonHeight = 45;
    const buttonY = y + height / 2;

    // Reset to Default button (on the left)
    this.resetButton = this.add
      .text(x, buttonY, 'Reset to Default', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#8c52ff',
        padding: {
          left: 15,
          right: 15,
          top: 10,
          bottom: 10,
        },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    // Add hover and click effects
    this.resetButton
      .on('pointerover', () => {
        this.resetButton.setStyle({ backgroundColor: '#713cda' });
      })
      .on('pointerout', () => {
        this.resetButton.setStyle({ backgroundColor: '#8c52ff' });
      })
      .on('pointerdown', () => {
        this.resetToDefault();
      });

    // Close button (on the right)
    this.closeButton = this.add
      .text(x + width, buttonY, 'Save & Close', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#38b000',
        padding: {
          left: 15,
          right: 15,
          top: 10,
          bottom: 10,
        },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    // Add hover and click effects to Save button
    this.closeButton
      .on('pointerover', () => {
        this.closeButton.setStyle({ backgroundColor: '#2d8a00' });
      })
      .on('pointerout', () => {
        this.closeButton.setStyle({ backgroundColor: '#38b000' });
      })
      .on('pointerdown', () => {
        this.saveSettings();
        this.scene.stop();
      });
  }

  private createDivider(x: number, y: number, width: number, color: number, depth: number) {
    const line = this.add.graphics();
    line.lineStyle(1, color, 0.5);
    line.beginPath();
    line.moveTo(x, y);
    line.lineTo(x + width, y);
    line.closePath();
    line.strokePath();
    line.setDepth(depth);
    return line;
  }

  private createKeyButton(x: number, y: number, text: string, key: string, height: number, width: number, depth: number): Phaser.GameObjects.Text {
    // Create button with modern styling
    const button = this.add
      .text(x, y, text, {
        fontSize: '16px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        backgroundColor: '#2a2a3a',
        padding: {
          left: 12,
          right: 12,
          top: 8,
          bottom: 8,
        },
        align: 'center',
      })
      .setOrigin(0, 0)
      .setDepth(depth);

    // Set fixed width for consistent layout
    button.setFixedSize(width, height);
    button.setAlign('center');

    // Make button interactive
    button.setInteractive({ useHandCursor: true });

    // Add hover state
    button
      .on('pointerover', () => {
        button.setStyle({ backgroundColor: '#3a3a4a' });
      })
      .on('pointerout', () => {
        if (this.listeningForKey !== key) {
          button.setStyle({ backgroundColor: '#2a2a3a' });
        }
      })
      .on('pointerdown', () => {
        // If already listening for another key, cancel that first
        if (this.listeningForKey && this.listeningForKey !== key) {
          this.cancelKeyBinding();
        }

        // Set this button to listen mode if not already
        if (this.listeningForKey !== key) {
          this.listeningForKey = key;
          button.setText('Press a key...');
          button.setStyle({ backgroundColor: '#713cda' });
        } else {
          // Cancel if clicked again
          this.cancelKeyBinding();
        }
      });

    // Store button for later reference
    this.buttons[key] = button;

    return button;
  }

  private handleKeyDown(event: KeyboardEvent) {
    // Ignore ESC key as it's used for cancellation
    if (event.keyCode === Phaser.Input.Keyboard.KeyCodes.ESC) {
      return;
    }

    // If we're listening for a key binding
    if (this.listeningForKey) {
      // Get the key code
      const keyCode = event.keyCode;

      // Update the appropriate key binding based on which one we're listening for
      if (this.listeningForKey === 'attack') {
        this.gameSettings.keybindings.attack = keyCode;
      } else {
        // It's an ability key
        this.gameSettings.keybindings.abilities[this.listeningForKey as keyof typeof this.gameSettings.keybindings.abilities] = keyCode;
      }

      // Update the button text and reset state
      const buttonKey = this.listeningForKey;
      this.updateButtonText(buttonKey, keyCode);

      // Reset listening state
      this.listeningForKey = null;
    }
  }

  private cancelKeyBinding() {
    if (this.listeningForKey && this.buttons[this.listeningForKey]) {
      // Get the current key code
      let currentKeyCode;
      if (this.listeningForKey === 'attack') {
        currentKeyCode = this.gameSettings.keybindings.attack;
      } else {
        // It's an ability key
        currentKeyCode = this.gameSettings.keybindings.abilities[this.listeningForKey as keyof typeof this.gameSettings.keybindings.abilities];
      }

      // Reset the button text and style
      this.buttons[this.listeningForKey].setText(this.getKeyName(currentKeyCode));
      this.buttons[this.listeningForKey].setStyle({
        backgroundColor: '#2a2a3a',
      });

      // Clear listening state
      this.listeningForKey = null;
    }
  }

  private updateButtonText(buttonKey: string, keyCode: number) {
    if (this.buttons[buttonKey]) {
      this.buttons[buttonKey].setText(this.getKeyName(keyCode));
      this.buttons[buttonKey].setStyle({ backgroundColor: '#2a2a3a' });
    }
  }

  private getDefaultSettings(): IGameSettings {
    return {
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

  private resetToDefault() {
    // Reset to default settings
    this.gameSettings = this.getDefaultSettings();

    // Update UI to reflect changes
    this.updateButtonTexts();
    this.updateChampionSpeed(this.gameSettings.championSpeed);
  }

  private updateButtonTexts() {
    // Update ability keys
    Object.entries(this.gameSettings.keybindings.abilities).forEach(([key, value]) => {
      this.updateButtonText(key, value);
    });

    // Update attack key
    this.updateButtonText('attack', this.gameSettings.keybindings.attack);
  }

  private saveSettings() {
    console.log('Saving settings:', this.gameSettings);

    // Apply callback with the updated settings
    this.onClose(this.gameSettings);

    // Also save to localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem('underoath_settings', JSON.stringify(this.gameSettings));
    }

    // Emit an event that settings have been updated
    this.events.emit('settings-updated', this.gameSettings);
  }

  private getKeyName(keyCode: number): string {
    // Helper function to get human-readable key names
    const keyNames: { [key: number]: string } = {
      // Letters
      65: 'A',
      66: 'B',
      67: 'C',
      68: 'D',
      69: 'E',
      70: 'F',
      71: 'G',
      72: 'H',
      73: 'I',
      74: 'J',
      75: 'K',
      76: 'L',
      77: 'M',
      78: 'N',
      79: 'O',
      80: 'P',
      81: 'Q',
      82: 'R',
      83: 'S',
      84: 'T',
      85: 'U',
      86: 'V',
      87: 'W',
      88: 'X',
      89: 'Y',
      90: 'Z',
      // Numbers
      48: '0',
      49: '1',
      50: '2',
      51: '3',
      52: '4',
      53: '5',
      54: '6',
      55: '7',
      56: '8',
      57: '9',
      // Special keys
      32: 'SPACE',
      16: 'SHIFT',
      17: 'CTRL',
      18: 'ALT',
      9: 'TAB',
      27: 'ESC',
      13: 'ENTER',
      // Arrow keys
      37: '←',
      38: '↑',
      39: '→',
      40: '↓',
    };

    return keyNames[keyCode] || `KEY ${keyCode}`;
  }
  /* END-USER-CODE */
}

/* END OF COMPILED CODE */
