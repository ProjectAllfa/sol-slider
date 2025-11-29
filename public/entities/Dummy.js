// Dummy entity for testing - can be pushed around
class Dummy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_down');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Dummy properties
        this.setCollideWorldBounds(true);
        this.setDepth(GameConfig.SPRITE_DEPTH);
        this.setScale(GameConfig.SPRITE_SCALE);
        this.setOrigin(0.5, 0.5);
        
        // Use circular collision centered on character
        const radius = Math.min(this.body.width, this.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        const offsetX = this.body.width / 2 + GameConfig.COLLISION_OFFSET_X;
        const offsetY = this.body.height / 2 + GameConfig.COLLISION_OFFSET_Y;
        this.body.setCircle(radius, offsetX, offsetY);
        
        // Physics properties for natural pushing
        this.body.setImmovable(false); // Can be pushed
        this.body.setMass(GameConfig.DUMMY_MASS);
        this.body.setBounce(GameConfig.DUMMY_BOUNCE);
        
        // Set a tint to distinguish from player
        this.setTint(0xff6666); // Red tint to make it visible as a dummy
        
        // Ice physics properties
        this.friction = GameConfig.DUMMY_FRICTION;
        this.minSpeed = GameConfig.DUMMY_MIN_SPEED;
    }

    // ===== PHYSICS UPDATE =====
    // This will run on SERVER in multiplayer
    updatePhysics(deltaTime) {
        // Apply friction (ice sliding effect)
        this.body.velocity.x *= this.friction;
        this.body.velocity.y *= this.friction;
        
        // Stop if moving very slowly
        if (Math.abs(this.body.velocity.x) < this.minSpeed) {
            this.body.velocity.x = 0;
        }
        if (Math.abs(this.body.velocity.y) < this.minSpeed) {
            this.body.velocity.y = 0;
        }
    }

    // ===== VISUAL UPDATE =====
    // This runs on CLIENT only - purely cosmetic
    updateVisuals() {
        // Dummy has no visual effects currently
        // Could add trails, particles, etc. here in the future
    }

    // ===== MAIN UPDATE =====
    // Currently calls both, but will be split in multiplayer
    update() {
        this.updatePhysics(this.scene.sys.game.loop.delta);
        this.updateVisuals();
    }
}

