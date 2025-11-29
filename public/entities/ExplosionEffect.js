// Futuristic explosion effect - expanding rings and particles with inverted colors
class ExplosionEffect {
    constructor(scene, x, y) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.explosionColors = GameConfig.TRAIL_COLORS; // Cyan, Magenta, Yellow
        this.particles = [];
        this.rings = [];
        this.duration = 600; // Total explosion duration in milliseconds
        this.startTime = scene.time.now;
        this.isDestroyed = false;
        
        this.createExplosion();
    }
    
    createExplosion() {
        // Create multiple expanding rings for futuristic effect
        const ringCount = 3;
        for (let i = 0; i < ringCount; i++) {
            const ring = this.scene.add.graphics();
            const colorIndex = i % this.explosionColors.length;
            const color = this.explosionColors[colorIndex];
            
            // Draw a circle ring
            ring.lineStyle(3, color, 1);
            ring.strokeCircle(this.x, this.y, 10 + (i * 5));
            ring.setDepth(0.15); // Above snow, below player
            
            this.rings.push({
                graphics: ring,
                startRadius: 10 + (i * 5),
                color: color,
                delay: i * 50, // Stagger the rings
                startTime: this.startTime + (i * 50)
            });
        }
        
        // Create particle burst effect
        const particleCount = 12;
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const colorIndex = i % this.explosionColors.length;
            const color = this.explosionColors[colorIndex];
            
            // Create a small circle particle
            const particle = this.scene.add.graphics();
            particle.fillStyle(color, 1);
            particle.fillCircle(0, 0, 4);
            particle.setPosition(this.x, this.y);
            particle.setDepth(0.15);
            
            this.particles.push({
                graphics: particle,
                angle: angle,
                color: color,
                speed: 2 + Math.random() * 2, // Random speed between 2-4
                startX: this.x,
                startY: this.y
            });
        }
    }
    
    update() {
        if (this.isDestroyed) return;
        
        const currentTime = this.scene.time.now;
        const elapsed = currentTime - this.startTime;
        const progress = elapsed / this.duration;
        
        if (progress >= 1) {
            // Clean up
            this.destroy();
            return;
        }
        
        // Update expanding rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const ring = this.rings[i];
            const ringElapsed = currentTime - ring.startTime;
            
            if (ringElapsed < 0) {
                continue; // Ring hasn't started yet
            }
            
            const ringProgress = Math.min(ringElapsed / (this.duration * 0.6), 1);
            
            // Expand the ring
            const currentRadius = ring.startRadius + (ringProgress * 80); // Expand to 80px radius
            
            // Clear and redraw with new radius
            ring.graphics.clear();
            const alpha = 1 - ringProgress; // Fade out as it expands
            ring.graphics.lineStyle(3, ring.color, alpha);
            ring.graphics.strokeCircle(this.x, this.y, currentRadius);
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            const particleProgress = progress;
            
            // Move particle outward
            const distance = particle.speed * (elapsed / 16); // Convert to pixels
            const newX = particle.startX + Math.cos(particle.angle) * distance;
            const newY = particle.startY + Math.sin(particle.angle) * distance;
            
            particle.graphics.setPosition(newX, newY);
            
            // Fade out particle
            const alpha = 1 - particleProgress;
            particle.graphics.clear();
            particle.graphics.fillStyle(particle.color, alpha);
            particle.graphics.fillCircle(0, 0, 4 * (1 - particleProgress * 0.5)); // Shrink slightly
        }
    }
    
    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;
        
        // Clean up all graphics
        for (const ring of this.rings) {
            if (ring.graphics && ring.graphics.active) {
                ring.graphics.destroy();
            }
        }
        
        for (const particle of this.particles) {
            if (particle.graphics && particle.graphics.active) {
                particle.graphics.destroy();
            }
        }
        
        this.rings = [];
        this.particles = [];
    }
}

