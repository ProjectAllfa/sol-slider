// Server-side player entity
// Physics calculations only - no rendering

const GameConfig = require('../config/GameConfig');

class ServerPlayer {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        
        // Physics body
        this.body = {
            velocity: { x: 0, y: 0 },
            acceleration: { x: 0, y: 0 },
            width: GameConfig.SPRITE_WIDTH,
            height: GameConfig.SPRITE_HEIGHT,
            mass: GameConfig.PLAYER_MASS
        };
        
        // Collision circle
        this.radius = Math.min(this.body.width, this.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        
        // Movement properties
        this.targetX = x;
        this.targetY = y;
        this.acceleration = GameConfig.PLAYER_ACCELERATION;
        this.friction = GameConfig.PLAYER_FRICTION;
        this.maxSpeed = GameConfig.PLAYER_MAX_SPEED;
        this.minSpeed = GameConfig.PLAYER_MIN_SPEED;
        
        // Dash properties
        this.dashSpeed = GameConfig.DASH_SPEED;
        this.dashCooldown = 0;
        this.dashCooldownTime = GameConfig.DASH_COOLDOWN;
        this.isDashing = false;
        this.dashEndTime = 0;
        this.dashImpactEndTime = 0;
        this.dashImpactConsumed = true;
        this.knockbackEndTime = 0;
        
        // Snowball properties
        this.snowballCooldown = 0;
        this.snowballCooldownTime = GameConfig.SNOWBALL_COOLDOWN;
        
        // Previous position for swept collision detection
        this.prevX = x;
        this.prevY = y;
        
        // Current direction for sprite
        this.currentDirection = 'down';
        
        // Frozen state
        this.isFrozen = false;
        this.frozenEndTime = 0;
    }

    setTarget(x, y) {
        // Frozen players cannot set new targets
        if (this.isFrozen) {
            return;
        }
        
        // Allow targeting outside bounds (players can fall off)
        this.targetX = x;
        this.targetY = y;
    }

    dash(currentTime) {
        // Check if frozen - frozen players cannot dash
        if (this.isFrozen) {
            return false;
        }
        
        // Check if dash is on cooldown
        if (this.dashCooldown > 0) {
            return false;
        }
        
        // Calculate direction to target (mouse click position)
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If no target or target is at current position, use current velocity direction
        let dashDirX, dashDirY;
        if (distance > 0.1) {
            // Normalize direction to target
            dashDirX = dx / distance;
            dashDirY = dy / distance;
        } else {
            // Fallback: use current velocity direction if available, otherwise default down
            const currentSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
            if (currentSpeed > 1) {
                dashDirX = this.body.velocity.x / currentSpeed;
                dashDirY = this.body.velocity.y / currentSpeed;
            } else {
                // Default to down if no movement
                dashDirX = 0;
                dashDirY = 1;
            }
        }
        
        // Apply dash velocity in target direction
        this.body.velocity.x = dashDirX * this.dashSpeed;
        this.body.velocity.y = dashDirY * this.dashSpeed;
        
        // Set dash state
        this.isDashing = true;
        this.dashEndTime = currentTime + GameConfig.DASH_DURATION;
        this.dashImpactConsumed = false;
        this.dashImpactEndTime = currentTime + GameConfig.DASH_IMPACT_WINDOW;
        this.dashCooldown = this.dashCooldownTime;
        
        return true;
    }

    isDashImpactActive(currentTime) {
        return !this.dashImpactConsumed && currentTime <= this.dashImpactEndTime;
    }

    consumeDashImpact() {
        this.dashImpactConsumed = true;
        this.isDashing = false;
    }

    applyKnockback(angle, force, currentTime) {
        this.body.velocity.x = Math.cos(angle) * force;
        this.body.velocity.y = Math.sin(angle) * force;
        this.body.acceleration.x = 0;
        this.body.acceleration.y = 0;
        this.knockbackEndTime = currentTime + GameConfig.DASH_KNOCKBACK_DURATION;
        // Reset target so we don't immediately accelerate back toward the old point
        this.targetX = this.x;
        this.targetY = this.y;
        
        // If frozen, remove freeze when hit by dash
        if (this.isFrozen) {
            const unfroze = this.unfreeze();
            // Notify callback if unfroze
            if (unfroze && this._onFrozenDestroyed) {
                this._onFrozenDestroyed(this.x, this.y);
            }
        }
    }
    
    // Set callback for frozen destroyed event
    setOnFrozenDestroyed(callback) {
        this._onFrozenDestroyed = callback;
    }
    
    freeze(currentTime) {
        this.isFrozen = true;
        this.frozenEndTime = currentTime + GameConfig.SNOWBALL_FREEZE_DURATION;
        
        // Stop all movement
        this.body.velocity.x = 0;
        this.body.velocity.y = 0;
        this.body.acceleration.x = 0;
        this.body.acceleration.y = 0;
        this.targetX = this.x;
        this.targetY = this.y;
    }
    
    unfreeze() {
        const wasFrozen = this.isFrozen;
        this.isFrozen = false;
        this.frozenEndTime = 0;
        return wasFrozen; // Return true if was frozen (for effect trigger)
    }
    
    updateFrozenState(currentTime) {
        if (this.isFrozen && currentTime >= this.frozenEndTime) {
            return this.unfreeze(); // Return true if unfroze
        }
        return false;
    }

    updateDirection(velocityX, velocityY) {
        // Determine direction based on velocity
        const absX = Math.abs(velocityX);
        const absY = Math.abs(velocityY);
        const totalSpeed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
        
        // If moving very slowly, keep current direction
        if (totalSpeed < GameConfig.DIRECTION_MIN_SPEED) {
            return;
        }
        
        const diagonalThreshold = GameConfig.DIRECTION_DIAGONAL_THRESHOLD;
        let direction = '';
        
        // Determine primary direction
        if (absY > absX) {
            direction = velocityY < 0 ? 'up' : 'down';
            if (absX > absY * diagonalThreshold) {
                if (velocityX < 0) {
                    direction = direction === 'up' ? 'up_left' : 'down_left';
                } else {
                    direction = direction === 'up' ? 'up_right' : 'down_right';
                }
            }
        } else {
            direction = velocityX < 0 ? 'left' : 'right';
            if (absY > absX * diagonalThreshold) {
                if (velocityY < 0) {
                    direction = direction === 'left' ? 'up_left' : 'up_right';
                } else {
                    direction = direction === 'left' ? 'down_left' : 'down_right';
                }
            }
        }
        
        // Update direction if changed
        if (direction && direction !== this.currentDirection) {
            this.currentDirection = direction;
        }
    }

    // Clear dash state (called AFTER collision check)
    clearExpiredDashState(currentTime) {
        if (!this.dashImpactConsumed && currentTime >= this.dashImpactEndTime) {
            this.dashImpactConsumed = true;
            this.isDashing = false;
        } else if (this.isDashing && currentTime >= this.dashEndTime) {
            this.isDashing = false;
        }
    }

    // Physics update - exact same logic as client Player.updatePhysics()
    updatePhysics(deltaTime, currentTime) {
        // NOTE: Don't clear isDashing here - it's cleared after collision check
        
        // Update frozen state and check if unfroze
        const unfroze = this.updateFrozenState(currentTime);
        
        // If unfroze, notify callback (will be handled by ServerGameLoop)
        if (unfroze && this._onFrozenDestroyed) {
            this._onFrozenDestroyed(this.x, this.y);
        }
        
        // If frozen, prevent self-movement but allow being pushed
        if (this.isFrozen) {
            // Block acceleration toward target (no self-movement)
            this.body.acceleration.x = 0;
            this.body.acceleration.y = 0;
            
            // Reset target to current position to prevent any movement
            this.targetX = this.x;
            this.targetY = this.y;
            
            // Apply friction to slow down (allows natural deceleration from pushes)
            this.body.velocity.x *= this.friction;
            this.body.velocity.y *= this.friction;
            
            // Stop if moving very slowly
            if (Math.abs(this.body.velocity.x) < this.minSpeed) {
                this.body.velocity.x = 0;
            }
            if (Math.abs(this.body.velocity.y) < this.minSpeed) {
                this.body.velocity.y = 0;
            }
            
            // Store previous position
            this.prevX = this.x;
            this.prevY = this.y;
            
            // Update position based on velocity (allows being pushed by collisions)
            const dt = deltaTime / 1000;
            this.x += this.body.velocity.x * dt;
            this.y += this.body.velocity.y * dt;
            
            // Update sprite direction based on velocity (if being pushed)
            this.updateDirection(this.body.velocity.x, this.body.velocity.y);
            
            return; // Skip normal movement logic (no acceleration toward target)
        }
        
        // Calculate direction to target
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        const velDotTarget = this.body.velocity.x * dx + this.body.velocity.y * dy;
        const passedTarget = velDotTarget < 0 && distance < GameConfig.PLAYER_DECELERATION_START;
        
        if (passedTarget) {
            // Stop tracking the old target so we don't get pulled back toward it
            this.targetX = this.x;
            this.targetY = this.y;
            dx = 0;
            dy = 0;
            distance = 0;
        }
        
        const inKnockback = currentTime < this.knockbackEndTime;
        
        // Apply acceleration toward target with gradual deceleration
        if (!inKnockback && distance > GameConfig.PLAYER_STOP_DISTANCE) {
            const angle = Math.atan2(dy, dx);
            const currentSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
            
            // Calculate acceleration multiplier based on distance
            let accelMultiplier = 1.0;
            if (distance < GameConfig.PLAYER_DECELERATION_START) {
                accelMultiplier = Math.max(0, 
                    (distance - GameConfig.PLAYER_STOP_DISTANCE) / 
                    (GameConfig.PLAYER_DECELERATION_START - GameConfig.PLAYER_STOP_DISTANCE)
                );
            }
            
            if (currentSpeed < this.maxSpeed) {
                this.body.acceleration.x = Math.cos(angle) * this.acceleration * accelMultiplier;
                this.body.acceleration.y = Math.sin(angle) * this.acceleration * accelMultiplier;
            } else {
                // Cap at max speed
                this.body.acceleration.x = 0;
                this.body.acceleration.y = 0;
                this.body.velocity.x = Math.cos(angle) * this.maxSpeed;
                this.body.velocity.y = Math.sin(angle) * this.maxSpeed;
            }
        } else {
            // Close enough to target, stop accelerating
            this.body.acceleration.x = 0;
            this.body.acceleration.y = 0;
        }
        
        if (inKnockback) {
            // Ignore self-acceleration while being knocked back
            this.body.acceleration.x = 0;
            this.body.acceleration.y = 0;
        }
        
        // Apply acceleration to velocity (deltaTime in seconds)
        const dt = deltaTime / 1000;
        this.body.velocity.x += this.body.acceleration.x * dt;
        this.body.velocity.y += this.body.acceleration.y * dt;
        
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
        
        // Store previous position before updating (for swept collision)
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update position
        this.x += this.body.velocity.x * dt;
        this.y += this.body.velocity.y * dt;
        
        // Note: Position clamping removed to allow falling off the map
        // Boundary checking is done in ServerGameLoop to detect elimination
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
            if (this.dashCooldown < 0) {
                this.dashCooldown = 0;
            }
        }
        
        // Update snowball cooldown
        if (this.snowballCooldown > 0) {
            this.snowballCooldown -= deltaTime;
            if (this.snowballCooldown < 0) {
                this.snowballCooldown = 0;
            }
        }
        
        // Update sprite direction based on velocity
        this.updateDirection(this.body.velocity.x, this.body.velocity.y);
    }
    
    canThrowSnowball() {
        return !this.isFrozen && this.snowballCooldown <= 0;
    }
    
    throwSnowball() {
        if (!this.canThrowSnowball()) {
            return false;
        }
        this.snowballCooldown = this.snowballCooldownTime;
        return true;
    }

    // Get state snapshot for network sync
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            velocityX: this.body.velocity.x,
            velocityY: this.body.velocity.y,
            targetX: this.targetX,
            targetY: this.targetY,
            isDashing: this.isDashing,
            dashCooldown: this.dashCooldown,
            currentDirection: this.currentDirection,
            isFrozen: this.isFrozen,
            snowballCooldown: this.snowballCooldown
        };
    }
}

module.exports = ServerPlayer;

