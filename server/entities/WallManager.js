// Server-side wall manager
// Tracks all wall segments and handles destruction

const GameConfig = require('../config/GameConfig');

class WallManager {
    constructor() {
        this.walls = new Map(); // wallId -> { x, y, width, height, destroyed }
        this.wallIdCounter = 0;
        this.initializeWalls();
    }

    initializeWalls() {
        const WALL_TILE_SIZE = GameConfig.WALL_TILE_SIZE;
        
        // Main corner tiles
        this.addWall('top_left_corner', 0, 0, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('top_right_corner', GameConfig.GAME_WIDTH - WALL_TILE_SIZE, 0, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('bottom_left_corner', 0, GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('bottom_right_corner', GameConfig.GAME_WIDTH - WALL_TILE_SIZE, GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        
        // Adjacent corner pieces
        this.addWall('right_next_to_top_left', WALL_TILE_SIZE, 0, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('below_top_left', 0, WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('next_to_top_right', GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2), 0, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('below_top_right', GameConfig.GAME_WIDTH - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('next_to_bottom_left', WALL_TILE_SIZE, GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('above_bottom_left', 0, GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2), WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('left_to_bottom_right', GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2), GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        this.addWall('above_bottom_right', GameConfig.GAME_WIDTH - WALL_TILE_SIZE, GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2), WALL_TILE_SIZE, WALL_TILE_SIZE);
        
        // Side tiles - break down into individual tiles
        // Top side: from x = WALL_TILE_SIZE * 2 to x = GAME_WIDTH - WALL_TILE_SIZE * 2
        const topSideStartX = WALL_TILE_SIZE * 2;
        const topSideEndX = GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2);
        const topSideTileCount = Math.floor((topSideEndX - topSideStartX) / WALL_TILE_SIZE);
        for (let i = 0; i < topSideTileCount; i++) {
            this.addWall(`top_side_${i}`, topSideStartX + (i * WALL_TILE_SIZE), 0, WALL_TILE_SIZE, WALL_TILE_SIZE);
        }
        
        // Bottom side
        const bottomSideStartX = WALL_TILE_SIZE * 2;
        const bottomSideEndX = GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2);
        const bottomSideTileCount = Math.floor((bottomSideEndX - bottomSideStartX) / WALL_TILE_SIZE);
        for (let i = 0; i < bottomSideTileCount; i++) {
            this.addWall(`bottom_side_${i}`, bottomSideStartX + (i * WALL_TILE_SIZE), GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, WALL_TILE_SIZE, WALL_TILE_SIZE);
        }
        
        // Left side: from y = WALL_TILE_SIZE * 2 to y = GAME_HEIGHT - WALL_TILE_SIZE * 2
        // Use Math.ceil to ensure we fill any gap and reach the "above bottom-left" piece
        const leftSideStartY = WALL_TILE_SIZE * 2;
        const leftSideEndY = GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2);
        const leftSideAvailableSpace = leftSideEndY - leftSideStartY;
        const leftSideTileCount = Math.ceil(leftSideAvailableSpace / WALL_TILE_SIZE);
        for (let i = 0; i < leftSideTileCount; i++) {
            this.addWall(`left_side_${i}`, 0, leftSideStartY + (i * WALL_TILE_SIZE), WALL_TILE_SIZE, WALL_TILE_SIZE);
        }
        
        // Right side
        // Use Math.ceil to ensure we fill any gap and reach the "above bottom-right" piece
        const rightSideStartY = WALL_TILE_SIZE * 2;
        const rightSideEndY = GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2);
        const rightSideAvailableSpace = rightSideEndY - rightSideStartY;
        const rightSideTileCount = Math.ceil(rightSideAvailableSpace / WALL_TILE_SIZE);
        for (let i = 0; i < rightSideTileCount; i++) {
            this.addWall(`right_side_${i}`, GameConfig.GAME_WIDTH - WALL_TILE_SIZE, rightSideStartY + (i * WALL_TILE_SIZE), WALL_TILE_SIZE, WALL_TILE_SIZE);
        }
    }

    addWall(id, x, y, width, height) {
        this.walls.set(id, {
            id: id,
            x: x,
            y: y,
            width: width,
            height: height,
            destroyed: false
        });
    }

    // Check collision between player and walls (with swept collision for fast movement)
    // Returns immediately after finding the closest collision to ensure only one tile is hit
    checkWallCollision(player) {
        const playerRadius = player.radius;
        const playerSpeed = Math.sqrt(player.body.velocity.x ** 2 + player.body.velocity.y ** 2);
        
        // Collect all potential collisions first, then find the closest one
        const collisions = [];
        
        for (const wall of this.walls.values()) {
            if (wall.destroyed) continue;
            
            // Use swept collision detection only for high-speed collisions (dash/high velocity)
            // For low-speed collisions, use simple circle-rectangle collision to avoid weird behavior
            let collisionPoint = null;
            let collisionDistance = Infinity;
            let useSwept = false;
            
            // Only use swept collision if player is moving fast (likely dashing)
            const useSweptCollision = playerSpeed >= GameConfig.WALL_DESTRUCTION_MIN_VELOCITY * 0.7; // 70% of destruction speed
            
            if (useSweptCollision && player.prevX !== undefined && player.prevY !== undefined &&
                (player.x !== player.prevX || player.y !== player.prevY)) {
                // Check swept collision (player movement line vs wall rectangle)
                const sweptResult = this.checkSweptCollision(player, wall);
                if (sweptResult) {
                    collisionPoint = sweptResult;
                    collisionDistance = sweptResult.distance;
                    useSwept = true;
                }
            }
            
            // Also check current position collision
            const closestX = Math.max(wall.x, Math.min(player.x, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(player.y, wall.y + wall.height));
            
            const dx = player.x - closestX;
            const dy = player.y - closestY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Use the closer collision (swept or current)
            let finalDistance = distance;
            let finalDx = dx;
            let finalDy = dy;
            
            if (collisionPoint && collisionDistance < distance) {
                finalDistance = collisionDistance;
                finalDx = collisionPoint.dx;
                finalDy = collisionPoint.dy;
            }
            
            if (finalDistance < playerRadius) {
                // Store collision info for sorting
                collisions.push({
                    wall: wall,
                    distance: finalDistance,
                    useSwept: useSwept && collisionPoint,
                    collisionPoint: collisionPoint,
                    dx: finalDx,
                    dy: finalDy
                });
            }
        }
        
        // If no collisions, return null
        if (collisions.length === 0) {
            return null;
        }
        
        // Sort by distance to find the closest collision (first one hit)
        collisions.sort((a, b) => a.distance - b.distance);
        
        // Handle only the closest collision
        const closest = collisions[0];
        const wall = closest.wall;
        const finalDistance = closest.distance;
        const useSwept = closest.useSwept;
        const collisionPoint = closest.collisionPoint;
        const finalDx = closest.dx;
        const finalDy = closest.dy;
        
        // Calculate wall center
        const wallCenterX = wall.x + wall.width / 2;
        const wallCenterY = wall.y + wall.height / 2;
        
        // Calculate direction from wall center to collision point (or player position)
        const collisionX = useSwept ? collisionPoint.x : player.x;
        const collisionY = useSwept ? collisionPoint.y : player.y;
        
        const centerDx = collisionX - wallCenterX;
        const centerDy = collisionY - wallCenterY;
        const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        
        // Normalize direction (from wall center to collision point)
        const nx = centerDistance > 0.001 ? centerDx / centerDistance : (finalDx / finalDistance || 0);
        const ny = centerDistance > 0.001 ? centerDy / centerDistance : (finalDy / finalDistance || 1);
        
        // Check if player has enough velocity to destroy wall
        if (playerSpeed >= GameConfig.WALL_DESTRUCTION_MIN_VELOCITY) {
            // Destroy wall
            wall.destroyed = true;
            
            // Stop dash immediately if active
            if (player.isDashing) {
                player.isDashing = false;
                player.dashImpactConsumed = true;
            }
            
            // Apply knockback in direction away from wall center
            const knockbackAngle = Math.atan2(ny, nx);
            player.body.velocity.x = Math.cos(knockbackAngle) * GameConfig.WALL_DESTRUCTION_KNOCKBACK;
            player.body.velocity.y = Math.sin(knockbackAngle) * GameConfig.WALL_DESTRUCTION_KNOCKBACK;
            
            // Move player away from wall by a safe distance (playerRadius + buffer)
            // Use larger buffer to ensure player is completely clear of all walls
            const safeDistance = playerRadius + 20; // Increased buffer to prevent hitting adjacent tiles
            player.x = wallCenterX + nx * safeDistance;
            player.y = wallCenterY + ny * safeDistance;
            
            return { wallId: wall.id, destroyed: true };
        } else {
            // Not enough velocity - simple wall collision
            // Use simple circle-rectangle collision for low-speed collisions
            // Find the closest point on the wall rectangle to the player
            const closestX = Math.max(wall.x, Math.min(player.x, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(player.y, wall.y + wall.height));
            
            // Calculate normal from closest point (not from center)
            const normalDx = player.x - closestX;
            const normalDy = player.y - closestY;
            const normalLength = Math.sqrt(normalDx * normalDx + normalDy * normalDy);
            
            // If player is exactly on the wall edge, use a default normal
            let normalX, normalY;
            if (normalLength < 0.001) {
                // Player is exactly on edge - determine which edge
                const distToLeft = player.x - wall.x;
                const distToRight = (wall.x + wall.width) - player.x;
                const distToTop = player.y - wall.y;
                const distToBottom = (wall.y + wall.height) - player.y;
                
                const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
                if (minDist === distToLeft) {
                    normalX = -1; normalY = 0; // Push right
                } else if (minDist === distToRight) {
                    normalX = 1; normalY = 0; // Push left
                } else if (minDist === distToTop) {
                    normalX = 0; normalY = -1; // Push down
                } else {
                    normalX = 0; normalY = 1; // Push up
                }
            } else {
                normalX = normalDx / normalLength;
                normalY = normalDy / normalLength;
            }
            
            // Push player out of wall
            const overlap = playerRadius - finalDistance;
            if (overlap > 0) {
                player.x = closestX + normalX * playerRadius;
                player.y = closestY + normalY * playerRadius;
            }
            
            // Simple velocity reflection along the normal
            const dot = player.body.velocity.x * normalX + player.body.velocity.y * normalY;
            if (dot < 0) { // Only reflect if moving towards wall
                player.body.velocity.x -= 2 * dot * normalX;
                player.body.velocity.y -= 2 * dot * normalY;
            }
            
            // Apply some damping to prevent sliding along walls
            const damping = 0.8;
            player.body.velocity.x *= damping;
            player.body.velocity.y *= damping;
            
            return { wallId: wall.id, destroyed: false };
        }
    }
    
    // Check swept collision between moving player circle and wall rectangle
    checkSweptCollision(player, wall) {
        if (player.prevX === undefined || player.prevY === undefined) return null;
        
        const dx = player.x - player.prevX;
        const dy = player.y - player.prevY;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null; // No movement
        
        // Expand wall rectangle by player radius
        const expandedWall = {
            x: wall.x - player.radius,
            y: wall.y - player.radius,
            width: wall.width + player.radius * 2,
            height: wall.height + player.radius * 2
        };
        
        // Check if movement line intersects expanded wall
        // Use ray-rectangle intersection
        const t0 = 0;
        const t1 = 1;
        
        let tmin = 0;
        let tmax = 1;
        
        const p0x = player.prevX;
        const p0y = player.prevY;
        const p1x = player.x;
        const p1y = player.y;
        
        // Check intersection with expanded rectangle edges
        if (Math.abs(dx) < 0.001) {
            // Vertical line
            if (p0x < expandedWall.x || p0x > expandedWall.x + expandedWall.width) return null;
            tmin = Math.max(tmin, (expandedWall.y - p0y) / dy);
            tmax = Math.min(tmax, (expandedWall.y + expandedWall.height - p0y) / dy);
        } else if (Math.abs(dy) < 0.001) {
            // Horizontal line
            if (p0y < expandedWall.y || p0y > expandedWall.y + expandedWall.height) return null;
            tmin = Math.max(tmin, (expandedWall.x - p0x) / dx);
            tmax = Math.min(tmax, (expandedWall.x + expandedWall.width - p0x) / dx);
        } else {
            // Check left and right edges
            const tLeft = (expandedWall.x - p0x) / dx;
            const tRight = (expandedWall.x + expandedWall.width - p0x) / dx;
            tmin = Math.max(tmin, Math.min(tLeft, tRight));
            tmax = Math.min(tmax, Math.max(tLeft, tRight));
            
            // Check top and bottom edges
            const tTop = (expandedWall.y - p0y) / dy;
            const tBottom = (expandedWall.y + expandedWall.height - p0y) / dy;
            tmin = Math.max(tmin, Math.min(tTop, tBottom));
            tmax = Math.min(tmax, Math.max(tTop, tBottom));
        }
        
        if (tmin <= tmax && tmin >= 0 && tmin <= 1) {
            // Collision at tmin
            const collisionX = p0x + dx * tmin;
            const collisionY = p0y + dy * tmin;
            
            // Find closest point on actual wall (not expanded)
            const closestX = Math.max(wall.x, Math.min(collisionX, wall.x + wall.width));
            const closestY = Math.max(wall.y, Math.min(collisionY, wall.y + wall.height));
            
            return {
                x: collisionX,
                y: collisionY,
                dx: collisionX - closestX,
                dy: collisionY - closestY,
                distance: Math.sqrt((collisionX - closestX) ** 2 + (collisionY - closestY) ** 2),
                t: tmin
            };
        }
        
        return null;
    }

    // Get wall destruction state
    getWallState() {
        const state = {};
        for (const wall of this.walls.values()) {
            state[wall.id] = wall.destroyed;
        }
        return state;
    }

    // Get destroyed walls (for syncing)
    getDestroyedWalls() {
        const destroyed = [];
        for (const wall of this.walls.values()) {
            if (wall.destroyed) {
                destroyed.push(wall.id);
            }
        }
        return destroyed;
    }

    // Reset all walls (set destroyed to false for all walls)
    resetWalls() {
        for (const wall of this.walls.values()) {
            wall.destroyed = false;
        }
        console.log('[WallManager] All walls reset for new round');
    }
}

module.exports = WallManager;

