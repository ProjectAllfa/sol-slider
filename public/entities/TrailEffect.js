// Trail effect for dash - quick color flash with fading trail
class TrailEffect {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.trails = []; // Array to store trail sprites
        this.trailColors = GameConfig.TRAIL_COLORS;
        this.trailLifetime = GameConfig.TRAIL_LIFETIME;
        this.trailInterval = GameConfig.TRAIL_INTERVAL;
        this.dashDuration = GameConfig.DASH_DURATION;
        this.flashDuration = GameConfig.TRAIL_FLASH_DURATION;
        this.lastTrailTime = 0;
        this.isActive = false;
    }

    start() {
        this.isActive = true;
        this.lastTrailTime = this.scene.time.now;
        
        // Flash the character with color
        this.flashCharacter();
    }

    stop() {
        this.isActive = false;
    }

    flashCharacter() {
        // Flash character with a color tint
        const flashColor = this.trailColors[Math.floor(Math.random() * this.trailColors.length)];
        this.player.setTint(flashColor);
        
        // Remove tint after flash duration
        this.scene.time.delayedCall(this.flashDuration, () => {
            this.player.clearTint();
        });
    }

    update() {
        const currentTime = this.scene.time.now;

        // Create new trail sprite at intervals (only when active)
        if (this.isActive && currentTime - this.lastTrailTime >= this.trailInterval) {
            this.createTrailSprite();
            this.lastTrailTime = currentTime;
        }

        // Always update and remove expired trails (even when not active, to clean up existing trails)
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            const elapsed = currentTime - trail.startTime;
            const progress = elapsed / this.trailLifetime;

            if (progress >= 1) {
                // Remove expired trail
                if (trail.sprite && trail.sprite.active) {
                    trail.sprite.destroy();
                }
                this.trails.splice(i, 1);
            } else {
                // Fade out trail quickly
                if (trail.sprite && trail.sprite.active) {
                    trail.sprite.setAlpha(1 - progress);
                }
            }
        }
    }

    createTrailSprite() {
        // Create a copy of the player sprite at current position
        const trailSprite = this.scene.add.sprite(
            this.player.x,
            this.player.y,
            this.player.texture.key
        );

        // Set properties to match player
        trailSprite.setScale(GameConfig.SPRITE_SCALE);
        trailSprite.setOrigin(0.5, 0.5);
        trailSprite.setDepth(0); // Behind player
        trailSprite.setAlpha(0.2); // Start slightly transparent

        // Apply random color from trail colors
        const colorIndex = Math.floor(Math.random() * this.trailColors.length);
        trailSprite.setTint(this.trailColors[colorIndex]);

        // Store trail data
        this.trails.push({
            sprite: trailSprite,
            startTime: this.scene.time.now
        });
    }

    clear() {
        // Remove all trails
        for (const trail of this.trails) {
            trail.sprite.destroy();
        }
        this.trails = [];
        this.isActive = false;
    }
}

