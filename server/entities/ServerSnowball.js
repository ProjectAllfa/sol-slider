// Server-side snowball entity
// Handles physics and collision detection

const GameConfig = require('../config/GameConfig');

class ServerSnowball {
    constructor(id, x, y, directionX, directionY, throwerId) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.radius = GameConfig.SNOWBALL_RADIUS;
        this.speed = GameConfig.SNOWBALL_SPEED;
        this.throwerId = throwerId; // ID of player who threw this snowball
        
        // Normalize direction
        const length = Math.sqrt(directionX * directionX + directionY * directionY);
        if (length > 0) {
            this.velocityX = (directionX / length) * this.speed;
            this.velocityY = (directionY / length) * this.speed;
        } else {
            // Default direction (down) if no direction provided
            this.velocityX = 0;
            this.velocityY = this.speed;
        }
        
        // Previous position for swept collision
        this.prevX = x;
        this.prevY = y;
        
        // Active flag
        this.active = true;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Store previous position
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Update position (deltaTime in milliseconds, convert to seconds)
        const dt = deltaTime / 1000;
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;
        
        // Check if out of bounds
        if (this.x < 0 || this.x > GameConfig.GAME_WIDTH ||
            this.y < 0 || this.y > GameConfig.GAME_HEIGHT) {
            this.active = false;
        }
    }
    
    // Check collision with player
    checkPlayerCollision(player) {
        if (!this.active || !player) return false;
        if (player.id === this.throwerId) return false; // Can't hit yourself
        
        // Calculate distance
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if colliding
        if (distance < this.radius + player.radius) {
            return true;
        }
        
        // Also check swept collision for fast-moving snowballs
        if (this.prevX !== undefined && this.prevY !== undefined &&
            (this.x !== this.prevX || this.y !== this.prevY)) {
            // Check if snowball swept through player
            const sweptResult = this.checkSweptCollision(player);
            if (sweptResult) {
                return true;
            }
        }
        
        return false;
    }
    
    // Check swept collision between snowball and player
    checkSweptCollision(player) {
        if (!player) return false;
        
        const dx = this.x - this.prevX;
        const dy = this.y - this.prevY;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return false;
        
        // Calculate relative movement
        const fx = this.prevX - player.x;
        const fy = this.prevY - player.y;
        
        const a = dx * dx + dy * dy;
        if (a < 0.0001) return false;
        
        const b = 2 * (fx * dx + fy * dy);
        const c = (fx * fx + fy * fy) - (this.radius + player.radius) ** 2;
        
        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t >= 0 && t <= 1) {
            return true;
        }
        
        return false;
    }
    
    // Check collision with wall
    checkWallCollision(wall) {
        if (!this.active || !wall || wall.destroyed) return false;
        
        // Circle-rectangle collision
        const closestX = Math.max(wall.x, Math.min(this.x, wall.x + wall.width));
        const closestY = Math.max(wall.y, Math.min(this.y, wall.y + wall.height));
        
        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.radius) {
            return true;
        }
        
        // Also check swept collision
        if (this.prevX !== undefined && this.prevY !== undefined &&
            (this.x !== this.prevX || this.y !== this.prevY)) {
            const sweptResult = this.checkSweptWallCollision(wall);
            if (sweptResult) {
                return true;
            }
        }
        
        return false;
    }
    
    // Check swept collision with wall
    checkSweptWallCollision(wall) {
        if (!wall) return false;
        
        const dx = this.x - this.prevX;
        const dy = this.y - this.prevY;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return false;
        
        // Expand wall by snowball radius
        const expandedWall = {
            x: wall.x - this.radius,
            y: wall.y - this.radius,
            width: wall.width + this.radius * 2,
            height: wall.height + this.radius * 2
        };
        
        // Ray-rectangle intersection
        const p0x = this.prevX;
        const p0y = this.prevY;
        const p1x = this.x;
        const p1y = this.y;
        
        let tmin = 0;
        let tmax = 1;
        
        if (Math.abs(dx) < 0.001) {
            // Vertical line
            if (p0x < expandedWall.x || p0x > expandedWall.x + expandedWall.width) return false;
            tmin = Math.max(tmin, (expandedWall.y - p0y) / dy);
            tmax = Math.min(tmax, (expandedWall.y + expandedWall.height - p0y) / dy);
        } else if (Math.abs(dy) < 0.001) {
            // Horizontal line
            if (p0y < expandedWall.y || p0y > expandedWall.y + expandedWall.height) return false;
            tmin = Math.max(tmin, (expandedWall.x - p0x) / dx);
            tmax = Math.min(tmax, (expandedWall.x + expandedWall.width - p0x) / dx);
        } else {
            // Check edges
            const tLeft = (expandedWall.x - p0x) / dx;
            const tRight = (expandedWall.x + expandedWall.width - p0x) / dx;
            tmin = Math.max(tmin, Math.min(tLeft, tRight));
            tmax = Math.min(tmax, Math.max(tLeft, tRight));
            
            const tTop = (expandedWall.y - p0y) / dy;
            const tBottom = (expandedWall.y + expandedWall.height - p0y) / dy;
            tmin = Math.max(tmin, Math.min(tTop, tBottom));
            tmax = Math.min(tmax, Math.max(tTop, tBottom));
        }
        
        return tmin <= tmax && tmin >= 0 && tmin <= 1;
    }
    
    // Get state for network sync
    getState() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            velocityX: this.velocityX,
            velocityY: this.velocityY,
            active: this.active
        };
    }
}

module.exports = ServerSnowball;

