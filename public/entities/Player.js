// Player entity class
class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_down');
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Player properties
        // Note: World bounds collision disabled to allow falling off the map
        this.setCollideWorldBounds(false);
        this.setDepth(GameConfig.SPRITE_DEPTH);
        
        // Scale up pixel art sprite
        this.setScale(GameConfig.SPRITE_SCALE);
        this.setOrigin(0.5, 0.5); // Center origin for proper rotation/positioning
        
        // Use circular collision centered on character
        const radius = Math.min(this.body.width, this.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        const offsetX = this.body.width / 2 + GameConfig.COLLISION_OFFSET_X;
        const offsetY = this.body.height / 2 + GameConfig.COLLISION_OFFSET_Y;
        this.body.setCircle(radius, offsetX, offsetY);
        
        // Physics properties for natural pushing
        this.body.setMass(GameConfig.PLAYER_MASS);
        this.body.setBounce(GameConfig.PLAYER_BOUNCE);
        
        // Movement properties (for ice sliding) - these drive physics on server
        this.targetX = x;
        this.targetY = y;
        this.acceleration = GameConfig.PLAYER_ACCELERATION;
        this.friction = GameConfig.PLAYER_FRICTION;
        this.maxSpeed = GameConfig.PLAYER_MAX_SPEED;
        this.minSpeed = GameConfig.PLAYER_MIN_SPEED;
        
        // Dash properties
        this.dashSpeed = GameConfig.DASH_SPEED;
        this.dashCooldown = 0; // Cooldown timer
        this.dashCooldownTime = GameConfig.DASH_COOLDOWN;
        this.isDashing = false
        
        // Trail effect
        this.trailEffect = null; // Will be initialized after scene is ready
        this.skatingTrail = null; // Will be initialized after scene is ready
        
        // Frozen effect
        this.frozenOverlay = null; // Will be initialized after scene is ready
        this.isFrozen = false;
        
        // Arrow indicator above player head (client-side only, local player only)
        this.arrowIndicator = null; // Will be initialized after scene is ready
        
        // Current direction for sprite
        this.currentDirection = 'down';
        
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
    }

    setTarget(x, y) {
        // Frozen players cannot set new targets
        if (this.isFrozen) {
            return;
        }
        
        this.targetX = x;
        this.targetY = y;
    }

    dash() {
        // Frozen players cannot dash
        if (this.isFrozen) {
            return;
        }
        
        // Check if dash is on cooldown
        if (this.dashCooldown > 0) {
            return;
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
        this.body.setVelocity(
            dashDirX * this.dashSpeed,
            dashDirY * this.dashSpeed
        );
        
        // Start trail effect
        if (this.trailEffect) {
            this.trailEffect.start();
            this.isDashing = true;
            
            // Stop dash flag after dash duration
            this.scene.time.delayedCall(GameConfig.DASH_DURATION, () => {
                if (this.trailEffect) {
                    this.trailEffect.stop();
                }
                this.isDashing = false;
            });
        } else {
            // If no trail effect, still set dash flag
            this.isDashing = true;
            this.scene.time.delayedCall(GameConfig.DASH_DURATION, () => {
                this.isDashing = false;
            });
        }
        
        // Set cooldown
        this.dashCooldown = this.dashCooldownTime;
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
        
        // Threshold for diagonal detection (ratio of smaller to larger component)
        const diagonalThreshold = GameConfig.DIRECTION_DIAGONAL_THRESHOLD;
        
        let direction = '';
        
        // Determine primary direction
        if (absY > absX) {
            // Vertical movement is dominant
            if (velocityY < 0) {
                direction = 'up';
            } else {
                direction = 'down';
            }
            
            // Check for diagonal - only use diagonal if horizontal movement is significant
            if (absX > absY * diagonalThreshold) {
                if (velocityX < 0) {
                    direction = direction === 'up' ? 'up_left' : 'down_left';
                } else {
                    direction = direction === 'up' ? 'up_right' : 'down_right';
                }
            }
        } else {
            // Horizontal movement is dominant
            if (velocityX < 0) {
                direction = 'left';
            } else {
                direction = 'right';
            }
            
            // Check for diagonal - only use diagonal if vertical movement is significant
            if (absY > absX * diagonalThreshold) {
                if (velocityY < 0) {
                    direction = direction === 'left' ? 'up_left' : 'up_right';
                } else {
                    direction = direction === 'left' ? 'down_left' : 'down_right';
                }
            }
        }
        
        // Update sprite if direction changed
        if (direction && direction !== this.currentDirection) {
            this.currentDirection = direction;
            this.setTexture(this.spriteKeys[direction]);
        }
    }

    // ===== PHYSICS UPDATE =====
    // This will run on SERVER in multiplayer
    updatePhysics(deltaTime) {
        // If game has ended, don't update physics (position is frozen)
        // Check both scene flag and player flag for reliability
        if ((this.scene && this.scene.gameEnded) || this.gameEnded) {
            return;
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
        
        // Apply acceleration toward target with gradual deceleration
        if (distance > GameConfig.PLAYER_STOP_DISTANCE) {
            const angle = Math.atan2(dy, dx);
            const currentSpeed = Math.sqrt(this.body.velocity.x ** 2 + this.body.velocity.y ** 2);
            
            // Calculate acceleration multiplier based on distance
            let accelMultiplier = 1.0;
            if (distance < GameConfig.PLAYER_DECELERATION_START) {
                // Gradually reduce acceleration as we approach target
                accelMultiplier = Math.max(0, 
                    (distance - GameConfig.PLAYER_STOP_DISTANCE) / 
                    (GameConfig.PLAYER_DECELERATION_START - GameConfig.PLAYER_STOP_DISTANCE)
                );
            }
            
            if (currentSpeed < this.maxSpeed) {
                this.body.setAcceleration(
                    Math.cos(angle) * this.acceleration * accelMultiplier,
                    Math.sin(angle) * this.acceleration * accelMultiplier
                );
            } else {
                // Cap at max speed
                this.body.setAcceleration(0, 0);
                this.body.setVelocity(
                    Math.cos(angle) * this.maxSpeed,
                    Math.sin(angle) * this.maxSpeed
                );
            }
        } else {
            // Close enough to target, stop accelerating
            this.body.setAcceleration(0, 0);
        }
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime;
            if (this.dashCooldown < 0) {
                this.dashCooldown = 0;
            }
        }
        
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
        // Update trail effect
        if (this.trailEffect) {
            this.trailEffect.update();
        }
        
        // Update skating trail
        if (this.skatingTrail) {
            this.skatingTrail.update();
        }
        
        // Update sprite direction based on velocity
        this.updateDirection(this.body.velocity.x, this.body.velocity.y);
        
        // Update frozen overlay position
        if (this.frozenOverlay) {
            this.frozenOverlay.x = this.x;
            this.frozenOverlay.y = this.y;
            this.frozenOverlay.setVisible(this.isFrozen);
        }
        
        // Update arrow indicator position (above player head)
        if (this.arrowIndicator) {
            this.arrowIndicator.x = this.x;
            // Position arrow above player head (offset by sprite height + some spacing)
            this.arrowIndicator.y = this.y - (this.height / 2) - 20; // 20px above sprite
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

    // ===== MAIN UPDATE =====
    // Currently calls both, but will be split in multiplayer
    update() {
        this.updatePhysics(this.scene.sys.game.loop.delta);
        this.updateVisuals();
    }
    
    destroy() {
        // Clean up arrow indicator
        if (this.arrowIndicator) {
            this.arrowIndicator.destroy();
        }
        
        // Clean up frozen overlay
        if (this.frozenOverlay) {
            this.frozenOverlay.destroy();
        }
        
        super.destroy();
    }
}

