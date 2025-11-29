// Remote player entity (controlled by server state)
// Physics body only for visual collision circle - actual physics handled by server
// Only interpolates position between server states

class RemotePlayer extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, playerState) {
        super(scene, playerState.x, playerState.y, 'player_down');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Store player ID
        this.playerId = playerState.id;
        
        // Visual properties
        this.setDepth(GameConfig.SPRITE_DEPTH);
        this.setScale(GameConfig.SPRITE_SCALE);
        this.setOrigin(0.5, 0.5);
        
        // Use EXACT same collision setup as local player (Player.js)
        // This ensures collision circles match perfectly for all players
        const radius = Math.min(this.body.width, this.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        const offsetX = this.body.width / 2 + GameConfig.COLLISION_OFFSET_X;
        const offsetY = this.body.height / 2 + GameConfig.COLLISION_OFFSET_Y;
        this.body.setCircle(radius, offsetX, offsetY);
        
        // Visual effects
        this.trailEffect = new TrailEffect(scene, this);
        this.skatingTrail = new SkatingTrail(scene, this);
        
        // Frozen effect
        this.frozenOverlay = null; // Will be initialized after scene is ready
        this.isFrozen = false;
        
        // Current direction for sprite
        this.currentDirection = playerState.currentDirection || 'down';
        
        // Store sprite keys
        this.spriteKeys = {
            'up': 'player_up',
            'down': 'player_down',
            'left': 'player_left',
            'right': 'player_right',
            'up_left': 'player_up_left',
            'up_right': 'player_up_right',
            'down_left': 'player_down_left',
            'down_right': 'player_down_right'
        };
        
        // State buffering for ultra-smooth interpolation
        this.stateBuffer = [];
        this.maxBufferSize = 5; // Buffer more states for smoother interpolation
        
        // Current interpolation state
        // Initialize all position values to match server state exactly
        this.targetX = playerState.x;
        this.targetY = playerState.y;
        this.currentX = playerState.x;
        this.currentY = playerState.y;
        // Also set sprite position immediately to prevent visual glitches
        this.x = playerState.x;
        this.y = playerState.y;
        
        // Velocity for smooth prediction
        this.velocityX = playerState.velocityX || 0;
        this.velocityY = playerState.velocityY || 0;
        this.lastUpdateTime = Date.now();
        
        // Last state
        this.isDashing = playerState.isDashing || false;
        this.lastIsDashing = false;
    }

    // Update from server state
    updateFromServer(playerState) {
        const now = Date.now();
        
        // Check for large position jumps (e.g., from being pushed) - snap immediately instead of interpolating
        const dx = playerState.x - this.x;
        const dy = playerState.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const largeJumpThreshold = 100; // If position changed by more than 100 pixels, snap immediately
        
        if (distance > largeJumpThreshold) {
            // Large jump detected - snap to server position immediately
            console.log(`[RemotePlayer] Large position jump detected (${distance.toFixed(1)}px), snapping to server position`);
            this.x = playerState.x;
            this.y = playerState.y;
            this.currentX = playerState.x;
            this.currentY = playerState.y;
            this.targetX = playerState.x;
            this.targetY = playerState.y;
            // Clear buffer to prevent interpolation from old position
            this.stateBuffer = [];
        }
        
        // Add state to buffer with timestamp
        this.stateBuffer.push({
            x: playerState.x,
            y: playerState.y,
            velocityX: playerState.velocityX,
            velocityY: playerState.velocityY,
            timestamp: now
        });
        
        // Keep buffer size limited
        if (this.stateBuffer.length > this.maxBufferSize) {
            this.stateBuffer.shift();
        }
        
        // Update velocity smoothly (blend instead of snap)
        const velBlend = 0.3; // Smooth velocity updates
        this.velocityX += (playerState.velocityX - this.velocityX) * velBlend;
        this.velocityY += (playerState.velocityY - this.velocityY) * velBlend;
        
        // Calculate target position with prediction
        // Use the most recent state, but predict slightly ahead based on velocity
        const latestState = this.stateBuffer[this.stateBuffer.length - 1];
        const timeSinceUpdate = (now - latestState.timestamp) / 1000; // seconds
        
        // Predict where player should be based on velocity
        this.targetX = latestState.x + this.velocityX * timeSinceUpdate;
        this.targetY = latestState.y + this.velocityY * timeSinceUpdate;
        
        this.lastUpdateTime = now;
        
        // Update direction
        if (playerState.currentDirection && playerState.currentDirection !== this.currentDirection) {
            this.currentDirection = playerState.currentDirection;
            this.setTexture(this.spriteKeys[this.currentDirection]);
        }
        
        // Check if started dashing
        if (playerState.isDashing && !this.lastIsDashing) {
            this.startDashEffect();
        }
        
        this.isDashing = playerState.isDashing;
        this.lastIsDashing = playerState.isDashing;
        
        // Update frozen state
        if (playerState.isFrozen !== undefined) {
            this.setFrozen(playerState.isFrozen);
        }
    }
    
    setFrozen(frozen) {
        this.isFrozen = frozen;
        if (this.frozenOverlay) {
            this.frozenOverlay.setVisible(frozen);
        }
        // Freeze sprite animation when frozen
        if (frozen) {
            this.setTint(0x88ccff); // Light blue tint
        } else {
            this.clearTint();
        }
    }

    startDashEffect() {
        if (this.trailEffect) {
            this.trailEffect.start();
            
            this.scene.time.delayedCall(GameConfig.DASH_DURATION, () => {
                if (this.trailEffect) {
                    this.trailEffect.stop();
                }
            });
        }
    }

    update(delta = 1000 / 60) {
        // Ultra-smooth interpolation with velocity-based prediction
        const dt = delta / 1000; // Convert to seconds
        
        // Calculate distance to target
        const dx = this.targetX - this.currentX;
        const dy = this.targetY - this.currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Adaptive interpolation speed based on distance
        // Close: slow and smooth, Far: faster to catch up
        let lerpFactor;
        if (distance < 5) {
            // Very close - very smooth
            lerpFactor = 0.08;
        } else if (distance < 20) {
            // Close - smooth
            lerpFactor = 0.15;
        } else if (distance < 50) {
            // Medium - moderate
            lerpFactor = 0.25;
        } else {
            // Far - catch up faster but still smooth
            lerpFactor = 0.35;
        }
        
        // Apply interpolation with frame-rate independence
        const normalizedDelta = Math.min(2, delta / (1000 / 60));
        this.currentX += dx * lerpFactor * normalizedDelta;
        this.currentY += dy * lerpFactor * normalizedDelta;
        
        // Also apply velocity-based prediction for extra smoothness
        // This helps fill in gaps between server updates
        if (this.stateBuffer.length > 0) {
            const timeSinceLastUpdate = (Date.now() - this.lastUpdateTime) / 1000;
            const predictedX = this.currentX + this.velocityX * timeSinceLastUpdate * 0.3;
            const predictedY = this.currentY + this.velocityY * timeSinceLastUpdate * 0.3;
            
            // Blend between interpolated position and predicted position
            this.x = this.currentX * 0.7 + predictedX * 0.3;
            this.y = this.currentY * 0.7 + predictedY * 0.3;
        } else {
            this.x = this.currentX;
            this.y = this.currentY;
        }
        
        // Update body velocity for visual effects (like skating trail) that read from body.velocity
        // The body exists for collision visualization but doesn't drive physics
        if (this.body) {
            this.body.velocity.x = this.velocityX;
            this.body.velocity.y = this.velocityY;
        }
        
        // Update visual effects
        if (this.trailEffect) {
            this.trailEffect.update();
        }
        
        if (this.skatingTrail) {
            this.skatingTrail.update();
        }
        
        // Update frozen overlay position
        if (this.frozenOverlay) {
            this.frozenOverlay.x = this.x;
            this.frozenOverlay.y = this.y;
            this.frozenOverlay.setVisible(this.isFrozen);
        }
    }

    destroy() {
        // Clean up effects
        if (this.trailEffect) {
            this.trailEffect.clear();
        }
        if (this.skatingTrail) {
            this.skatingTrail.clear();
        }
        if (this.frozenOverlay) {
            this.frozenOverlay.destroy();
        }
        
        super.destroy();
    }
}

