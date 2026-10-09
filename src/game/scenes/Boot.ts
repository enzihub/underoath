import * as Phaser from 'phaser';

export default class Boot extends Phaser.Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create a circular spinner similar to the one in the game page
        const spinnerContainer = this.add.container(width / 2, height / 2 - 40);

        // Create a background for the loading area with a gradient
        const background = this.add.rectangle(
          width / 2,
          height / 2,
          width,
          height,
          0x000000,
          1,
        );
        const gradient = this.add.graphics();
        gradient.fillGradientStyle(
          0x0a1a3f, // dark blue at the top
          0x0a1a3f,
          0x051025, // darker blue at the bottom
          0x051025,
          1,
        );
        gradient.fillRect(0, 0, width, height);

        // Create the spinner circle
        const spinner = this.add.circle(0, 0, 40, 0x222222, 0.7);
        const spinnerBorder = this.add.arc(0, 0, 40, 0, 0, false, 0x9a67ea, 1);
        spinnerBorder.setStrokeStyle(4, 0x9a67ea, 1);

        spinnerContainer.add([spinner, spinnerBorder]);

        // Add text below the spinner
        const loadingText = this.make.text({
          x: width / 2,
          y: height / 2 + 40,
          text: 'Preparing Battle...',
          style: {
            font: '24px Arial',
            color: '#9a67ea',
            fontStyle: 'bold',
          },
        });
        loadingText.setOrigin(0.5, 0.5);

        const subText = this.make.text({
          x: width / 2,
          y: height / 2 + 70,
          text: 'Entering the realm of darkness',
          style: {
            font: '16px Arial',
            color: '#cccccc',
          },
        });
        subText.setOrigin(0.5, 0.5);

        // Percent text inside the spinner
        const percentText = this.make.text({
          x: width / 2,
          y: height / 2 - 40,
          text: '0%',
          style: {
            font: '18px Arial',
            color: '#ffffff',
          },
        });
        percentText.setOrigin(0.5, 0.5);

        // Rotate the spinner with animation
        this.tweens.add({
          targets: spinnerBorder,
          angle: 360,
          duration: 1000,
          repeat: -1,
          ease: 'Linear',
        });

        // Loading event handlers
        this.load.on('progress', (value: number) => {
          const percent = Math.floor(value * 100);
          percentText.setText(`${percent}%`);

          // Update spinner progress arc
          spinnerBorder.setAngle(value * 360);
        });

        this.load.on('complete', () => {
          // Clean up loading elements
          spinnerContainer.destroy();
          loadingText.destroy();
          subText.destroy();
          percentText.destroy();
          background.destroy();
          gradient.destroy();
        });

        // Load the standard preloader pack
        this.load.pack('pack', 'assets/boot-asset-pack.json');
    }

    create ()
    {
        // Generate particle textures
        this.generateParticleTextures();
        
        // Move to preloader scene
      
      this.scene.start('MainMenu');
    }

    private generateParticleTextures() {
        // Generate simple circular particle
        const particles = this.textures.createCanvas('particle', 32, 32);
        const context = particles?.getContext();

        // Blue particle
        const gradient = context?.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient?.addColorStop(0, 'rgba(120, 180, 255, 1.0)');
        gradient?.addColorStop(0.5, 'rgba(80, 150, 255, 0.8)');
        gradient?.addColorStop(1, 'rgba(40, 100, 255, 0.0)');

        if (context && gradient) {
          context.fillStyle = gradient;
          context.fillRect(0, 0, 32, 32);
        }

        // Yellow particle
        const yellowParticles = this.textures.createCanvas(
          'yellow_particle',
          32,
          32,
        );
        const yellowContext = yellowParticles?.getContext();

        const yellowGradient = yellowContext?.createRadialGradient(
          16,
          16,
          0,
          16,
          16,
          16,
        );
        yellowGradient?.addColorStop(0, 'rgba(255, 220, 100, 1.0)');
        yellowGradient?.addColorStop(0.5, 'rgba(255, 190, 40, 0.8)');
        yellowGradient?.addColorStop(1, 'rgba(255, 160, 0, 0.0)');

        if (yellowContext && yellowGradient) {
          yellowContext.fillStyle = yellowGradient;
          yellowContext.fillRect(0, 0, 32, 32);
        }

        // Update textures
        particles?.refresh();
        yellowParticles?.refresh();
    }
}
