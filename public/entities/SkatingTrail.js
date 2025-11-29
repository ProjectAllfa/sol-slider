// Skating trail effect - two trails behind character for ice skating
class SkatingTrail {
    constructor(scene, player) {
        this.scene = scene;
        this.player = player;
        this.trails = []; // Array to store trail graphics
        this.trailColor = GameConfig.SKATING_TRAIL_COLOR;
        this.trailLifetime = GameConfig.SKATING_TRAIL_LIFETIME;
        this.trailInterval = GameConfig.SKATING_TRAIL_INTERVAL;
        this.lastTrailTime = 0;
        this.trailWidth = GameConfig.SKATING_TRAIL_WIDTH;
        this.baseFootOffset = GameConfig.SKATING_TRAIL_FOOT_OFFSET;
        this.trailLength = GameConfig.SKATING_TRAIL_LENGTH;
        this.lastLeftFootPos = { x: 0, y: 0 };
        this.lastRightFootPos = { x: 0, y: 0 };
        this.lastAngle = 0;
    }

    update() {
        const currentTime = this.scene.time.now;
        
        // Handle both physics-enabled and visual-only players
        const velX = this.player.body ? this.player.body.velocity.x : (this.player.velocityX || 0);
        const velY = this.player.body ? this.player.body.velocity.y : (this.player.velocityY || 0);
        const currentSpeed = Math.sqrt(velX ** 2 + velY ** 2);

            // Only create trails when moving
            if (currentSpeed > GameConfig.SKATING_TRAIL_MIN_SPEED) {
                // Calculate angle of movement
                const angle = Math.atan2(velY, velX);
            
            // Calculate angle change (turning)
            this.angleChange = angle - this.lastAngle;
            // Normalize angle change
            if (this.angleChange > Math.PI) this.angleChange -= 2 * Math.PI;
            if (this.angleChange < -Math.PI) this.angleChange += 2 * Math.PI;
            this.lastAngle = angle;
            
            // Perpendicular angle for left/right offset
            const perpAngle = angle + Math.PI / 2;
            
            // Fixed offset for straight, stable lines
            const leftFootOffset = this.baseFootOffset;
            const rightFootOffset = this.baseFootOffset;
            
            // Calculate left and right foot positions (straight, no variation)
            const leftFootX = this.player.x + Math.cos(perpAngle) * leftFootOffset;
            const leftFootY = this.player.y + Math.sin(perpAngle) * leftFootOffset;
            const rightFootX = this.player.x - Math.cos(perpAngle) * rightFootOffset;
            const rightFootY = this.player.y - Math.sin(perpAngle) * rightFootOffset;
            
            // Create new trail marks on the ground at intervals
            if (currentTime - this.lastTrailTime >= this.trailInterval) {
                // Create continuous lines by connecting to previous positions
                if (this.lastLeftFootPos.x !== 0 || this.lastLeftFootPos.y !== 0) {
                    this.createGroundMark(
                        this.lastLeftFootPos.x, this.lastLeftFootPos.y,
                        leftFootX, leftFootY, 'left'
                    );
                }
                if (this.lastRightFootPos.x !== 0 || this.lastRightFootPos.y !== 0) {
                    this.createGroundMark(
                        this.lastRightFootPos.x, this.lastRightFootPos.y,
                        rightFootX, rightFootY, 'right'
                    );
                }
                
                // Update last positions for next connection
                this.lastLeftFootPos = { x: leftFootX, y: leftFootY };
                this.lastRightFootPos = { x: rightFootX, y: rightFootY };
                this.lastTrailTime = currentTime;
            }
        } else {
            // Reset positions when stopped
            this.lastLeftFootPos = { x: 0, y: 0 };
            this.lastRightFootPos = { x: 0, y: 0 };
        }

        // Update and remove expired trails
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const trail = this.trails[i];
            const elapsed = currentTime - trail.startTime;
            const progress = elapsed / this.trailLifetime;

            if (progress >= 1) {
                // Remove expired trail
                if (trail.graphics && trail.graphics.active) {
                    trail.graphics.destroy();
                }
                this.trails.splice(i, 1);
            } else {
                // Fade out trail
                if (trail.graphics && trail.graphics.active) {
                    const alpha = 1 - progress;
                    trail.graphics.setAlpha(alpha);
                }
            }
        }
    }

    createGroundMark(x1, y1, x2, y2, side) {
        // Create a continuous line segment connecting previous position to current
        // This creates unbroken trails even when turning
        const graphics = this.scene.add.graphics();
        
        // Draw a continuous line from previous position to current position
        graphics.lineStyle(this.trailWidth, this.trailColor, 1);
        graphics.moveTo(x1, y1);
        graphics.lineTo(x2, y2);
        graphics.strokePath();
        graphics.setDepth(0.15); // Above snow layers (0, 0.1) but below player (1)
        
        // Store trail data - this mark stays in place and fades out
        this.trails.push({
            graphics: graphics,
            startTime: this.scene.time.now,
            side: side,
            x: x2,
            y: y2
        });
    }

    clear() {
        // Remove all trails
        for (const trail of this.trails) {
            if (trail.graphics && trail.graphics.active) {
                trail.graphics.destroy();
            }
        }
        this.trails = [];
    }
}

