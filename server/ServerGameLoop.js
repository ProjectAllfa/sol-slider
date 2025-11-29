// Server-side game loop
// Handles physics updates and collision detection

const GameConfig = require('./config/GameConfig');
const WallManager = require('./entities/WallManager');
const ServerSnowball = require('./entities/ServerSnowball');

class ServerGameLoop {
    constructor() {
        this.players = new Map(); // playerId -> ServerPlayer
        this.snowballs = new Map(); // snowballId -> ServerSnowball
        this.snowballIdCounter = 0;
        this.wallManager = new WallManager();
        this.lastUpdateTime = Date.now();
        this.isRunning = false;
        this.gameEnded = false; // Flag to stop player updates but keep loop running
        this.updateInterval = null;
        this.onPlayerEliminated = null; // Callback for player elimination
        this.onWallDestroyed = null; // Callback for wall destruction
        this.onSnowballImpact = null; // Callback for snowball impact
        this.onFrozenDestroyed = null; // Callback for frozen destroyed
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.gameEnded = false; // Reset game ended flag when starting
        this.lastUpdateTime = Date.now();
        
        // Fixed timestep game loop
        this.updateInterval = setInterval(() => {
            this.update();
        }, GameConfig.SERVER_TICK_RATE);
        
        console.log(`[Server] Game loop started (${GameConfig.SERVER_UPDATE_RATE} ticks/sec)`);
    }

    stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('[Server] Game loop stopped');
    }
    
    setGameEnded(ended) {
        this.gameEnded = ended;
        if (ended) {
            console.log('[Server] Game ended - player updates stopped, loop continues');
        } else {
            console.log('[Server] Game resumed - player updates enabled');
        }
    }

    addPlayer(player) {
        this.players.set(player.id, player);
        // Set callback for frozen destroyed event
        player.setOnFrozenDestroyed((x, y) => {
            if (this.onFrozenDestroyed) {
                this.onFrozenDestroyed(player.id, x, y);
            }
        });
        console.log(`[Server] Player ${player.id} added to game loop`);
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        console.log(`[Server] Player ${playerId} removed from game loop`);
    }

    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    update() {
        const currentTime = Date.now();
        const deltaTime = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        if (this.gameEnded) {
            // Game has ended - gradually stop players but keep collision checks active
            // Update player positions based on current velocity (for collision detection)
            for (const player of this.players.values()) {
                // Check if player has already stopped (velocity is 0)
                const isStopped = player.body.velocity.x === 0 && player.body.velocity.y === 0;
                
                if (!isStopped) {
                    // Store previous position for collision detection
                    player.prevX = player.x;
                    player.prevY = player.y;
                    
                    // Apply strong damping to quickly reduce velocity to 0
                    const damping = 0.85; // Strong damping (reduces velocity by 15% each frame)
                    player.body.velocity.x *= damping;
                    player.body.velocity.y *= damping;
                    
                    // Stop if moving very slowly
                    const minSpeed = 1.0;
                    if (Math.abs(player.body.velocity.x) < minSpeed) {
                        player.body.velocity.x = 0;
                    }
                    if (Math.abs(player.body.velocity.y) < minSpeed) {
                        player.body.velocity.y = 0;
                    }
                    
                    // Update position based on velocity (so collisions can stop them)
                    const dt = deltaTime / 1000;
                    player.x += player.body.velocity.x * dt;
                    player.y += player.body.velocity.y * dt;
                } else {
                    // Player has stopped - keep position frozen
                    // Still store previous position for consistency
                    player.prevX = player.x;
                    player.prevY = player.y;
                }
                
                // Reset target to prevent any acceleration
                player.targetX = player.x;
                player.targetY = player.y;
            }
            
            // Still check collisions to prevent players from going through walls or off map
            this.checkWallCollisions(currentTime);
            this.checkBoundaries(currentTime);
            this.checkCollisions(currentTime);
            
            // Update snowballs (they should also stop)
            this.updateSnowballs(deltaTime, currentTime);
            this.checkSnowballCollisions(currentTime);
            this.cleanupSnowballs();
        } else {
            // Normal game updates
            // Update all players physics (but don't clear dash state yet)
            // Note: updatePhysics stores prevX/prevY at the end, so they're available for next frame's swept collision
            for (const player of this.players.values()) {
                player.updatePhysics(deltaTime, currentTime);
            }
            
            // Update all snowballs
            this.updateSnowballs(deltaTime, currentTime);
            
            // Check wall collisions (using swept collision to catch fast-moving players)
            this.checkWallCollisions(currentTime);
            
            // Check for players who fell off the map (elimination)
            this.checkBoundaries(currentTime);
            
            // Check collisions WHILE dash states are still active
            this.checkCollisions(currentTime);
            
            // Check snowball collisions
            this.checkSnowballCollisions(currentTime);
            
            // NOW clear dash states after collision check
            for (const player of this.players.values()) {
                player.clearExpiredDashState(currentTime);
            }
            
            // Remove inactive snowballs
            this.cleanupSnowballs();
        }
    }
    
    // Update all snowballs
    updateSnowballs(deltaTime, currentTime) {
        for (const snowball of this.snowballs.values()) {
            snowball.update(deltaTime);
        }
    }
    
    // Check snowball collisions with players and walls
    checkSnowballCollisions(currentTime) {
        for (const snowball of this.snowballs.values()) {
            if (!snowball.active) continue;
            
            // Check collision with players
            for (const player of this.players.values()) {
                if (snowball.checkPlayerCollision(player)) {
                    // Hit player - freeze them
                    player.freeze(currentTime);
                    
                    // Notify callback for impact effect
                    if (this.onSnowballImpact) {
                        this.onSnowballImpact(snowball.x, snowball.y);
                    }
                    
                    snowball.active = false;
                    break; // Snowball is destroyed, stop checking
                }
            }
            
            // Check collision with walls
            if (snowball.active) {
                for (const wall of this.wallManager.walls.values()) {
                    if (snowball.checkWallCollision(wall)) {
                        // Hit wall - destroy snowball
                        
                        // Notify callback for impact effect
                        if (this.onSnowballImpact) {
                            this.onSnowballImpact(snowball.x, snowball.y);
                        }
                        
                        snowball.active = false;
                        break; // Snowball is destroyed, stop checking
                    }
                }
            }
        }
    }
    
    // Remove inactive snowballs
    cleanupSnowballs() {
        const toRemove = [];
        for (const [id, snowball] of this.snowballs.entries()) {
            if (!snowball.active) {
                toRemove.push(id);
            }
        }
        for (const id of toRemove) {
            this.snowballs.delete(id);
        }
    }
    
    // Create a new snowball
    throwSnowball(throwerId, startX, startY, targetX, targetY) {
        const player = this.players.get(throwerId);
        if (!player) return null;
        
        // Check if player is frozen
        if (player.isFrozen) return null;
        
        // Check cooldown (we'll add this to player state)
        // For now, we'll handle cooldown in the socket handler
        
        // Calculate direction
        const dx = targetX - startX;
        const dy = targetY - startY;
        
        // Create snowball
        const snowballId = `snowball_${this.snowballIdCounter++}`;
        const snowball = new ServerSnowball(snowballId, startX, startY, dx, dy, throwerId);
        this.snowballs.set(snowballId, snowball);
        
        return snowball;
    }
    
    // Check wall collisions for all players
    checkWallCollisions(currentTime) {
        for (const player of this.players.values()) {
            const collisionResult = this.wallManager.checkWallCollision(player);
            if (collisionResult && collisionResult.destroyed) {
                // Wall was destroyed - notify callback
                if (this.onWallDestroyed) {
                    this.onWallDestroyed(collisionResult.wallId);
                }
            }
        }
    }

    // Check if any players have fallen off the map
    checkBoundaries(currentTime) {
        const eliminatedPlayers = [];
        
        for (const player of this.players.values()) {
            // Check if player is completely outside the map bounds
            // Use radius to check if the entire player circle is outside
            const isOutOfBounds = 
                player.x + player.radius < 0 ||
                player.x - player.radius > GameConfig.GAME_WIDTH ||
                player.y + player.radius < 0 ||
                player.y - player.radius > GameConfig.GAME_HEIGHT;
            
            if (isOutOfBounds) {
                eliminatedPlayers.push(player.id);
            }
        }
        
        // Emit elimination events for eliminated players
        if (eliminatedPlayers.length > 0 && this.onPlayerEliminated) {
            for (const playerId of eliminatedPlayers) {
                this.onPlayerEliminated(playerId);
            }
        }
    }

    checkCollisions(currentTime) {
        const playerArray = Array.from(this.players.values());
        
        // Check each pair of players
        for (let i = 0; i < playerArray.length; i++) {
            for (let j = i + 1; j < playerArray.length; j++) {
                const player1 = playerArray[i];
                const player2 = playerArray[j];
                
                // First, check if circles overlap NOW (current position)
                const dx = player2.x - player1.x;
                const dy = player2.y - player1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = player1.radius + player2.radius;
                
                if (distance < minDistance && distance > 0) {
                    // Check if players are separating (moving away from each other)
                    // If so, they've already passed through - use swept collision to find impact point
                    const relVelX = player2.body.velocity.x - player1.body.velocity.x;
                    const relVelY = player2.body.velocity.y - player1.body.velocity.y;
                    const nx = dx / distance;
                    const ny = dy / distance;
                    const velAlongNormal = relVelX * nx + relVelY * ny;
                    
                    // If separating AND they moved this frame, they likely passed through
                    // Use swept collision to find the actual impact point (only if they weren't overlapping at start)
                    if (velAlongNormal > 0 && 
                        (player1.prevX !== undefined && player2.prevX !== undefined) &&
                        ((player1.x !== player1.prevX || player1.y !== player1.prevY) ||
                         (player2.x !== player2.prevX || player2.y !== player2.prevY))) {
                        // Check if they were overlapping at start
                        const startDx = player2.prevX - player1.prevX;
                        const startDy = player2.prevY - player1.prevY;
                        const startDist = Math.sqrt(startDx * startDx + startDy * startDy);
                        
                        // Only use swept collision if they weren't overlapping at start
                        // (if they were overlapping at start, they've been colliding - handle normally)
                        if (startDist >= minDistance) {
                            const sweptResult = this.checkSweptCollisionGeneral(player1, player2, currentTime);
                            if (sweptResult) {
                                // Use swept collision for accurate impact point
                                this.handleSweptCollision(player1, player2, sweptResult, currentTime);
                                continue;
                            }
                        }
                    }
                    
                    // Normal collision at current positions
                    this.handleCollision(player1, player2, dx, dy, distance, currentTime);
                } else {
                    // No overlap at current positions - check if they swept through each other
                    // This prevents tunneling at high speeds for ALL collisions, not just dashes
                    const sweptResult = this.checkSweptCollisionGeneral(player1, player2, currentTime);
                    if (sweptResult) {
                        // Swept collision detected - handle it
                        this.handleSweptCollision(player1, player2, sweptResult, currentTime);
                    }
                }
            }
        }
    }
    
    // Check if moving player swept through stationary player between prevPos and currentPos
    // This is the OLD method - kept for dash-specific swept collision
    checkSweptCollision(movingPlayer, otherPlayer, currentTime) {
        if (!movingPlayer || !otherPlayer) return false;
        if (movingPlayer.prevX === undefined) return false;
        if (!movingPlayer.isDashImpactActive(currentTime)) return false;
        
        // Calculate closest point on movement line segment to other player
        const dx = movingPlayer.x - movingPlayer.prevX;
        const dy = movingPlayer.y - movingPlayer.prevY;
        const fx = movingPlayer.prevX - otherPlayer.x;
        const fy = movingPlayer.prevY - otherPlayer.y;
        
        const a = dx * dx + dy * dy;
        if (a < 0.0001) return false; // No movement
        
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - (movingPlayer.radius + otherPlayer.radius) ** 2;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false; // No intersection
        
        // Check if collision happened during this frame (t between 0 and 1)
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t >= 0 && t <= 1) {
            const impactX = movingPlayer.prevX + dx * t;
            const impactY = movingPlayer.prevY + dy * t;
            const impactNx = (otherPlayer.x - impactX);
            const impactNy = (otherPlayer.y - impactY);
            return this.processDashImpact(
                movingPlayer,
                otherPlayer,
                impactNx,
                impactNy,
                currentTime
            );
        }
        return false;
    }
    
    // General swept collision detection for ALL collisions (both players can be moving)
    // Returns collision info if detected, null otherwise
    checkSweptCollisionGeneral(player1, player2, currentTime) {
        if (!player1 || !player2) return null;
        if (player1.prevX === undefined || player2.prevX === undefined) return null;
        
        // Calculate relative movement (player2 relative to player1)
        const relDx = (player2.x - player2.prevX) - (player1.x - player1.prevX);
        const relDy = (player2.y - player2.prevY) - (player1.y - player1.prevY);
        
        // If no relative movement, no swept collision possible
        if (Math.abs(relDx) < 0.0001 && Math.abs(relDy) < 0.0001) return null;
        
        // Calculate relative position at start of frame
        const startDx = player2.prevX - player1.prevX;
        const startDy = player2.prevY - player1.prevY;
        const startDist = Math.sqrt(startDx * startDx + startDy * startDy);
        const minDist = player1.radius + player2.radius;
        
        // If already overlapping at start, handle as normal collision
        if (startDist < minDist) return null;
        
        // Solve quadratic equation for circle-circle swept collision
        // Equation: ||(startPos + t * relVel)||^2 = minDist^2
        const a = relDx * relDx + relDy * relDy;
        const b = 2 * (startDx * relDx + startDy * relDy);
        const c = startDx * startDx + startDy * startDy - minDist * minDist;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return null; // No intersection
        
        // Find earliest collision time (t between 0 and 1)
        const sqrtDisc = Math.sqrt(discriminant);
        const t1 = (-b - sqrtDisc) / (2 * a);
        const t2 = (-b + sqrtDisc) / (2 * a);
        
        let t = null;
        if (t1 >= 0 && t1 <= 1) {
            t = t1;
        } else if (t2 >= 0 && t2 <= 1) {
            t = t2;
        } else {
            return null; // Collision not during this frame
        }
        
        // Calculate positions at collision time
        const p1AtImpactX = player1.prevX + (player1.x - player1.prevX) * t;
        const p1AtImpactY = player1.prevY + (player1.y - player1.prevY) * t;
        const p2AtImpactX = player2.prevX + (player2.x - player2.prevX) * t;
        const p2AtImpactY = player2.prevY + (player2.y - player2.prevY) * t;
        
        // Calculate collision normal (from player1 to player2 at impact time)
        const impactDx = p2AtImpactX - p1AtImpactX;
        const impactDy = p2AtImpactY - p1AtImpactY;
        const impactDist = Math.sqrt(impactDx * impactDx + impactDy * impactDy);
        
        if (impactDist < 0.0001) return null; // Degenerate case
        
        return {
            t: t,
            nx: impactDx / impactDist,
            ny: impactDy / impactDist,
            p1X: p1AtImpactX,
            p1Y: p1AtImpactY,
            p2X: p2AtImpactX,
            p2Y: p2AtImpactY
        };
    }
    
    // Handle swept collision - similar to handleCollision but uses impact positions
    handleSweptCollision(player1, player2, sweptResult, currentTime) {
        const { nx, ny, p1X, p1Y, p2X, p2Y } = sweptResult;
        
        // Move players to impact positions (prevent tunneling)
        player1.x = p1X;
        player1.y = p1Y;
        player2.x = p2X;
        player2.y = p2Y;
        
        // Ensure proper separation at impact positions (they should be exactly touching, but add small buffer)
        const minDistance = player1.radius + player2.radius;
        const currentDx = player2.x - player1.x;
        const currentDy = player2.y - player1.y;
        const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
        
        if (currentDistance < minDistance && currentDistance > 0) {
            // Separate to exact boundary (shouldn't happen, but safety check)
            const overlap = minDistance - currentDistance;
            const separationX = nx * overlap * 0.5;
            const separationY = ny * overlap * 0.5;
            player1.x -= separationX;
            player1.y -= separationY;
            player2.x += separationX;
            player2.y += separationY;
        }
        
        // Check for dash impacts first (using impact normal)
        const dashImpact1 = this.processDashImpact(player1, player2, nx, ny, currentTime);
        const dashImpact2 = this.processDashImpact(player2, player1, -nx, -ny, currentTime);
        
        if (dashImpact1 || dashImpact2) {
            // Dash impact occurred - separate players to prevent getting stuck
            // Impact positions are exactly at collision boundary, so add separation buffer
            // This ensures they don't trigger collision detection again in the next frame
            const separationAmount = 1.0; // Separation buffer (larger to prevent stuck state)
            player1.x -= nx * separationAmount;
            player1.y -= ny * separationAmount;
            player2.x += nx * separationAmount;
            player2.y += ny * separationAmount;
            
            // Verify final separation
            const finalDx = player2.x - player1.x;
            const finalDy = player2.y - player1.y;
            const finalDistance = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
            if (finalDistance < minDistance) {
                // Still too close - push apart more
                const extraOverlap = minDistance - finalDistance + 0.5;
                player1.x -= nx * extraOverlap * 0.5;
                player1.y -= ny * extraOverlap * 0.5;
                player2.x += nx * extraOverlap * 0.5;
                player2.y += ny * extraOverlap * 0.5;
            }
            return;
        }
        
        // Normal collision physics (no dash)
        // Calculate relative velocity
        const relVelX = player2.body.velocity.x - player1.body.velocity.x;
        const relVelY = player2.body.velocity.y - player1.body.velocity.y;
        
        // Calculate relative velocity in collision normal direction
        const velAlongNormal = relVelX * nx + relVelY * ny;
        
        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return;
        
        // Calculate restitution (bounce)
        const restitution = (GameConfig.PLAYER_BOUNCE + GameConfig.PLAYER_BOUNCE) / 2;
        
        // Calculate impulse scalar
        let impulseMagnitude = -(1 + restitution) * velAlongNormal;
        impulseMagnitude /= (1 / player1.body.mass) + (1 / player2.body.mass);
        
        // Apply impulse
        const impulseX = impulseMagnitude * nx;
        const impulseY = impulseMagnitude * ny;
        
        player1.body.velocity.x -= impulseX / player1.body.mass;
        player1.body.velocity.y -= impulseY / player1.body.mass;
        player2.body.velocity.x += impulseX / player2.body.mass;
        player2.body.velocity.y += impulseY / player2.body.mass;
    }
    
    processDashImpact(dasher, target, nx, ny, currentTime) {
        if (!dasher || !target) return false;
        if (!dasher.isDashImpactActive(currentTime)) {
            return false;
        }
        
        const angle = Math.atan2(ny, nx);
        target.applyKnockback(angle, GameConfig.DASH_BOOST_FORCE, currentTime);
        
        // Apply recoil to dasher - they slow down from the impact
        dasher.body.velocity.x *= GameConfig.DASH_RECOIL;
        dasher.body.velocity.y *= GameConfig.DASH_RECOIL;
        
        dasher.consumeDashImpact();
        return true;
    }

    handleCollision(player1, player2, dx, dy, distance, currentTime) {
        // Calculate collision normal (BEFORE separation - this is the true collision direction)
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Separate players to prevent overlap
        const overlap = (player1.radius + player2.radius) - distance;
        const separationX = nx * overlap * 0.5;
        const separationY = ny * overlap * 0.5;
        
        player1.x -= separationX;
        player1.y -= separationY;
        player2.x += separationX;
        player2.y += separationY;
        
        // Use ORIGINAL collision normal for dash impacts (not recalculated after separation)
        // The original normal represents the true collision direction before any position adjustments
        // Recalculating after separation can give wrong direction if dasher has already passed through
        // Dash impact check (skip normal physics if dash hit happens)
        if (this.processDashImpact(player1, player2, nx, ny, currentTime)) {
            return;
        }
        if (this.processDashImpact(player2, player1, -nx, -ny, currentTime)) {
            return;
        }
        
        // Normal collision physics (no dash)
        // Calculate relative velocity
        const relVelX = player2.body.velocity.x - player1.body.velocity.x;
        const relVelY = player2.body.velocity.y - player1.body.velocity.y;
        
        // Calculate relative velocity in collision normal direction
        const velAlongNormal = relVelX * nx + relVelY * ny;
        
        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return;
        
        // Calculate restitution (bounce)
        const restitution = (GameConfig.PLAYER_BOUNCE + GameConfig.PLAYER_BOUNCE) / 2;
        
        // Calculate impulse scalar
        let impulseMagnitude = -(1 + restitution) * velAlongNormal;
        impulseMagnitude /= (1 / player1.body.mass) + (1 / player2.body.mass);
        
        // Apply impulse
        const impulseX = impulseMagnitude * nx;
        const impulseY = impulseMagnitude * ny;
        
        player1.body.velocity.x -= impulseX / player1.body.mass;
        player1.body.velocity.y -= impulseY / player1.body.mass;
        player2.body.velocity.x += impulseX / player2.body.mass;
        player2.body.velocity.y += impulseY / player2.body.mass;
    }

    // Get full game state
    getGameState() {
        const players = {};
        for (const [id, player] of this.players.entries()) {
            players[id] = player.getState();
        }
        
        const snowballs = {};
        for (const [id, snowball] of this.snowballs.entries()) {
            snowballs[id] = snowball.getState();
        }
        
        return {
            players,
            snowballs,
            walls: this.wallManager.getWallState(),
            timestamp: Date.now()
        };
    }
    
    // Get wall manager (for accessing wall state)
    getWallManager() {
        return this.wallManager;
    }
}

module.exports = ServerGameLoop;

