// Client-side snowball entity
// Visual representation only - physics handled by server

class Snowball extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'snowball');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Visual properties
        this.setScale(GameConfig.SNOWBALL_SPRITE_SCALE);
        this.setOrigin(0.5, 0.5);
        this.setDepth(GameConfig.SPRITE_DEPTH - 0.1); // Slightly below players
        
        // Collision circle (for visual only)
        this.body.setCircle(GameConfig.SNOWBALL_RADIUS);
        
        // State
        this.snowballId = null;
        this.active = true;
        
        // Interpolation state
        this.serverX = x;
        this.serverY = y;
        this.velocityX = 0;
        this.velocityY = 0;
        this.lastServerUpdateTime = Date.now();
        
        // Start at server position
        this.x = x;
        this.y = y;
    }
    
    // Update from server state
    updateFromServer(state) {
        if (!state) return;
        
        this.snowballId = state.id;
        this.active = state.active !== false;
        
        // Store server position and velocity
        this.serverX = state.x;
        this.serverY = state.y;
        this.velocityX = state.velocityX || 0;
        this.velocityY = state.velocityY || 0;
        this.lastServerUpdateTime = Date.now();
        
        // If discrepancy is too large (teleport/correction), snap immediately
        const dx = this.serverX - this.x;
        const dy = this.serverY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 100) {
            // Large discrepancy - snap to server position
            this.x = this.serverX;
            this.y = this.serverY;
        }
    }
    
    update(delta = 1000 / 60) {
        if (!this.active) {
            this.setVisible(false);
            return;
        }
        
        const dt = delta / 1000; // Convert to seconds
        
        // Calculate time since last server update
        const timeSinceUpdate = (Date.now() - this.lastServerUpdateTime) / 1000;
        
        // Predict where snowball should be based on server position + velocity
        // Since snowballs move at constant velocity, we can predict accurately
        const predictedX = this.serverX + this.velocityX * timeSinceUpdate;
        const predictedY = this.serverY + this.velocityY * timeSinceUpdate;
        
        // Calculate distance to predicted position
        const dx = predictedX - this.x;
        const dy = predictedY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If very close, use predicted position directly
        if (distance < 1) {
            this.x = predictedX;
            this.y = predictedY;
        } else {
            // Smooth interpolation toward predicted position
            // Use adaptive lerp factor based on distance
            let lerpFactor = 0.3; // Default smooth interpolation
            if (distance > 50) {
                lerpFactor = 0.6; // Catch up faster if far away
            } else if (distance < 5) {
                lerpFactor = 0.15; // Very smooth when close
            }
            
            // Frame-rate independent interpolation
            const normalizedDelta = Math.min(2, delta / (1000 / 60));
            this.x += dx * lerpFactor * normalizedDelta;
            this.y += dy * lerpFactor * normalizedDelta;
        }
        
        // Update body velocity for visual effects
        if (this.body) {
            this.body.velocity.x = this.velocityX;
            this.body.velocity.y = this.velocityY;
        }
    }
    
    destroy() {
        super.destroy();
    }
}

