// You can write more code here

/* START OF COMPILED CODE */

import * as Phaser from 'phaser';
/* START-USER-IMPORTS */
import { EventBus } from '../EventBus';
/* END-USER-IMPORTS */

export default class GameOver extends Phaser.Scene {
	private isVictory: boolean = false;
	private enemiesDefeated: number = 0;
	private timePlayed: number = 0;
	private defeatedBoss: boolean = false;
	private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

	constructor() {
		super("GameOver");

		/* START-USER-CTR-CODE */
		// Write your code here.
		/* END-USER-CTR-CODE */
	}

	editorCreate(): void {
		// background - we'll replace this in create()
		const background = this.add.image(512, 384, "background");
		background.alpha = 0.5;
		background.alphaTopLeft = 0.5;
		background.alphaTopRight = 0.5;
		background.alphaBottomLeft = 0.5;
		background.alphaBottomRight = 0.5;
		background.visible = false;

		// textgameover - we'll replace this in create()
		const textgameover = this.add.text(512, 384, "", {});
		textgameover.setOrigin(0.5, 0.5);
		textgameover.text = "Game Over";
		textgameover.setStyle({ "align": "center", "color": "#ffffff", "fontFamily": "Arial Black", "fontSize": "64px", "stroke": "#000000", "strokeThickness":8});
		textgameover.visible = false;

		this.events.emit("scene-awake");
	}

	/* START-USER-CODE */
	init(data: {
		isVictory: boolean;
		enemiesDefeated: number;
		timePlayed: number;
		defeatedBoss?: boolean;
	}) {
		this.isVictory = data.isVictory;
		this.enemiesDefeated = data.enemiesDefeated;
		this.timePlayed = data.timePlayed;
		this.defeatedBoss = data.defeatedBoss || false;
	}

	create() {
		this.editorCreate();

		const { width, height } = this.scale;
		const centerX = width / 2;
		const centerY = height / 2;

		// Add a gradient background for better appearance
		const bg = this.add.graphics();
		if (this.isVictory) {
			bg.fillGradientStyle(
				0x0a1a3f, // dark blue at the center
				0x0a1a3f,
				0x051025, // darker blue at the edges
				0x051025,
				0.9,
			);
		} else {
			bg.fillGradientStyle(
				0x3f0a0a, // dark red at the center
				0x3f0a0a,
				0x250510, // darker red at the edges
				0x250510,
				0.9,
			);
		}
		bg.fillRect(0, 0, width, height);

		// Add particle effects for victory
		if (this.isVictory && this.textures.exists('yellow_particle')) {
			this.createVictoryParticles(width, height);
		}

		// Add the main title with animation
		const title = this.isVictory
			? this.defeatedBoss
				? 'LEGENDARY VICTORY!'
				: 'VICTORY!'
			: 'DEFEAT';

		const titleColor = this.isVictory
			? this.defeatedBoss
				? '#FF00FF' // Purple for boss victory
				: '#FFD700' // Gold for regular victory
			: '#FF4545'; // Red for defeat

		const titleText = this.add
			.text(centerX, centerY - 180, title, {
				fontSize: '72px',
				fontFamily: 'Arial Black, Impact, sans-serif',
				color: titleColor,
				stroke: '#000',
				strokeThickness: 8,
			})
			.setOrigin(0.5)
			.setAlpha(0); // Start invisible for animation

		// Add animation to title
		this.tweens.add({
			targets: titleText,
			alpha: 1,
			y: centerY - 160,
			scale: 1.1,
			duration: 1000,
			ease: 'Bounce.Out',
			onComplete: () => {
				// Add glow effect after animation completes
				titleText.setBlendMode(Phaser.BlendModes.ADD);
			},
		});

		// Add game stats with improved styling
		const statsStyle = {
			fontSize: '28px',
			fontFamily: 'Arial, sans-serif',
			color: '#FFFFFF',
			stroke: '#000000',
			strokeThickness: 2,
		};

		// Create a stats container with background
		const statsContainer = this.add.container(centerX, centerY - 40);

		const statsBg = this.add.graphics();
		statsBg.fillStyle(0x0a1a3f, 0.5);
		statsBg.fillRoundedRect(-200, -50, 400, 100, 10);
		statsBg.lineStyle(2, 0x4285f4, 0.8);
		statsBg.strokeRoundedRect(-200, -50, 400, 100, 10);

		statsContainer.add(statsBg);

		// Add stats with icons
		const enemiesText = this.add
			.text(0, -30, `⚔️ Enemies Defeated: ${this.enemiesDefeated}`, statsStyle)
			.setOrigin(0.5);

		statsContainer.add(enemiesText);

		// Convert time played from ms to minutes and seconds
		const minutes = Math.floor(this.timePlayed / 60000);
		const seconds = Math.floor((this.timePlayed % 60000) / 1000);

		const timeText = this.add
			.text(0, 10, `⏱️ Time Played: ${minutes}m ${seconds}s`, statsStyle)
			.setOrigin(0.5);

		statsContainer.add(timeText);

		// Animate stats container
		this.tweens.add({
			targets: statsContainer,
			alpha: { from: 0, to: 1 },
			y: { from: centerY - 20, to: centerY - 40 },
			duration: 800,
			delay: 300,
			ease: 'Power2',
		});

		// Add a message with better styling
		let message = '';
		if (this.isVictory) {
			if (this.defeatedBoss) {
				message =
					'You have conquered the darkness and emerged victorious! The realm of Underoath bows to your power.';
			} else {
				message = 'You have successfully defended against the forces of evil!';
			}
		} else {
			message = 'The darkness has consumed you... Your journey ends here.';
		}

		const messageText = this.add
			.text(centerX, centerY + 50, message, {
				fontSize: '24px',
				fontFamily: 'Arial, sans-serif',
				color: '#CCCCCC',
				align: 'center',
				wordWrap: { width: width * 0.8 },
				stroke: '#000000',
				strokeThickness: 1,
			})
			.setOrigin(0.5)
			.setAlpha(0);

		// Animate message
		this.tweens.add({
			targets: messageText,
			alpha: 1,
			duration: 800,
			delay: 600,
			ease: 'Power1',
		});

		// Create buttons
		this.createButtons(centerX, centerY);

		// Add listener for ESC key to return to menu
		this.input.keyboard?.on('keydown-ESC', () => {
			this.changeScene();
		});

		EventBus.emit('current-scene-ready', this);
	}

	private createVictoryParticles(width: number, height: number) {
		// Star particles for victory celebration
		this.particles = this.add.particles(0, 0, 'yellow_particle', {
			x: { min: 0, max: width },
			y: { min: 0, max: height / 2 },
			lifespan: { min: 3000, max: 8000 },
			speedY: { min: 20, max: 50 },
			scale: { start: 0.2, end: 0 },
			quantity: 2,
			blendMode: Phaser.BlendModes.ADD,
			emitting: true,
		});
	}

	private createButtons(centerX: number, centerY: number) {
		// Create button container
		const buttonContainer = this.add.container(centerX, centerY + 150);

		// Style for buttons
		const buttonStyle = {
			fontSize: '28px',
			fontFamily: 'Arial Black, sans-serif',
			color: '#FFFFFF',
		};

		// Play Again button
		const playAgainButton = this.add.text(0, 0, '▶ Play Again', buttonStyle).setOrigin(0.5);
		playAgainButton.setInteractive({ useHandCursor: true })
			.on('pointerover', () => {
				playAgainButton.setTint(0xccccff);
				playAgainButton.setScale(1.1);
			})
			.on('pointerout', () => {
				playAgainButton.clearTint();
				playAgainButton.setScale(1);
			})
			.on('pointerdown', () => {
				this.scene.start('Game');
			});

		// Return to Menu button
		const menuButton = this.add.text(0, 70, '🏠 Main Menu', buttonStyle).setOrigin(0.5);
		menuButton.setInteractive({ useHandCursor: true })
			.on('pointerover', () => {
				menuButton.setTint(0xccccff);
				menuButton.setScale(1.1);
			})
			.on('pointerout', () => {
				menuButton.clearTint();
				menuButton.setScale(1);
			})
			.on('pointerdown', () => {
				this.changeScene();
			});

		buttonContainer.add([playAgainButton, menuButton]);

		// Animate button container
		buttonContainer.setAlpha(0);
		this.tweens.add({
			targets: buttonContainer,
			alpha: 1,
			y: centerY + 150,
			duration: 800,
			delay: 900,
			ease: 'Back.Out',
		});
	}

	changeScene() {
		this.scene.start('MainMenu');
	}
	/* END-USER-CODE */
}

/* END OF COMPILED CODE */

// You can write more code here
