// Frozen destroyed effect - plays spritesheet animation when freeze ends
class FrozenDestroyedEffect {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.isDestroyed = false;
        
        // Create sprite for animation
        this.sprite = scene.add.sprite(x, y, 'frozen_destroyed');
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(GameConfig.SPRITE_DEPTH + 0.2); // Above players
        this.sprite.setScale(GameConfig.SPRITE_SCALE);
        
        // Play animation
        this.sprite.play('frozen_destroyed');
        
        // Destroy when animation completes
        this.sprite.on('animationcomplete', () => {
            this.destroy();
        });
    }
    
    update() {
        // Animation is handled by Phaser, just check if destroyed
        if (this.isDestroyed) return;
    }
    
    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        
        if (this.sprite && this.sprite.active) {
            this.sprite.destroy();
        }
    }
}

