// You can write more code here

import { IGameSettings } from "../types";

/* START OF COMPILED CODE */

/* START-USER-IMPORTS */
/* END-USER-IMPORTS */

export default class MainMenu extends Phaser.Scene {

	constructor() {
		super("MainMenu");

		/* START-USER-CTR-CODE */
		// Write your code here.

		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {
		// Border resize
		this.scale.resize(1920,1080);

		// escKey
		const escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

		// rectangle_1
		const rectangle_1 = this.add.rectangle(960, 540, 128, 128);
		rectangle_1.scaleX = 14.683547190885083;
		rectangle_1.scaleY = 8.224461868156856;
		rectangle_1.isFilled = true;
		rectangle_1.fillColor = 4524375;

		// text
		const text = this.add.text(960, 464, "", {});
		text.name = "text";
		text.setInteractive(new Phaser.Geom.Rectangle(0, 0, 122, 49.93359375), Phaser.Geom.Rectangle.Contains);
		text.setOrigin(0.5, 0.5);
		text.text = "Settings";
		text.setStyle({ "align": "center", "color": "#ffffff", "fontFamily": "Arial Black", "fontSize": "38px", "stroke": "#000000", "strokeThickness": 8 });

		// text_1
		const text_1 = this.add.text(960, 352, "", {});
		text_1.name = "text_1";
		text_1.setInteractive(new Phaser.Geom.Rectangle(0, 0, 122, 49.93359375), Phaser.Geom.Rectangle.Contains);
		text_1.setOrigin(0.5, 0.5);
		text_1.text = "Play";
		text_1.setStyle({ "align": "center", "color": "#ffffff", "fontFamily": "Arial Black", "fontSize": "38px", "stroke": "#000000", "strokeThickness": 8 });

		this.text = text;
		this.text_1 = text_1;
		this.escKey = escKey;

		this.events.emit("scene-awake");
	}

	private text!: Phaser.GameObjects.Text;
	private text_1!: Phaser.GameObjects.Text;
	private escKey!: Phaser.Input.Keyboard.Key;

	/* START-USER-CODE */


	// Write your code here

	create() {

		this.editorCreate();
		// Access the text_1 element by finding it in the scene
		// const text1 = this.children.getByName("text_1") as Phaser.GameObjects.Text;
		this.text_1.on('pointerdown', () => {
			this.handlePlayGame();
		});

		this.text.on('pointerdown', () => {
			this.handleSettings();
		});
	}

	update() {
		// Check for escape key press to toggle back to the game if it's paused
		if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
			// Check if Game scene exists and is paused
			if (this.scene.get('Game').scene.isPaused()) {
				// Resume the Game scene and stop this one
				this.scene.resume('Game');
				this.scene.stop();
			}
		}
	}

	handlePlayGame() {
		this.scene.start('Game');
	}

	private handleSettings() {
		// Launch the Settings scene
		this.scene.launch('Settings', {
			gameSettings: this.registry.get('gameSettings'),
			onClose: (settings: IGameSettings) => {
				// Update registry with new settings
				this.registry.set('gameSettings', settings);

				// Store in localStorage
				if (typeof window !== 'undefined') {
					localStorage.setItem('underoath_settings', JSON.stringify(settings));
				}
			}
		});
	}

	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here