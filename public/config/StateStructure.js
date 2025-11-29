// State structure documentation for multiplayer synchronization
// This defines what data gets sent between client and server

/**
 * Player State Snapshot
 * This is the authoritative state sent from server to all clients
 */
const PlayerStateSnapshot = {
    // Identity
    id: 'string',              // Unique player ID
    
    // Position & Physics (server-authoritative)
    x: 0,                      // X position
    y: 0,                      // Y position
    velocityX: 0,              // X velocity
    velocityY: 0,              // Y velocity
    
    // Movement State
    targetX: 0,                // Target position X (where player is moving to)
    targetY: 0,                // Target position Y
    isDashing: false,          // Is player currently dashing
    dashCooldown: 0,           // Remaining dash cooldown (ms)
    
    // Visual State
    currentDirection: 'down',  // Sprite direction (up, down, left, right, diagonals)
    
    // Timestamp (for interpolation)
    timestamp: 0               // Server timestamp when state was captured
};

/**
 * Client Input Message
 * Sent from client to server when player performs action
 */
const ClientInputMessage = {
    // Input type
    type: 'MOVE' | 'DASH',     // Action type
    
    // Movement input
    targetX: 0,                // Click position X (for MOVE)
    targetY: 0,                // Click position Y (for MOVE)
    
    // Timestamp
    timestamp: 0,              // Client timestamp (for lag compensation)
    sequenceNumber: 0          // Incremental number for input ordering
};

/**
 * Game State Snapshot
 * Complete game state sent to newly connected clients
 */
const GameStateSnapshot = {
    players: {},               // Map of playerId -> PlayerStateSnapshot
    timestamp: 0               // Server timestamp
};

/**
 * Collision Event
 * Sent from server when collision occurs (for effects/sounds)
 */
const CollisionEvent = {
    type: 'DASH_COLLISION' | 'NORMAL_COLLISION',
    playerId1: 'string',       // First player involved
    playerId2: 'string',       // Second player involved
    pushForce: 0,              // Force applied
    timestamp: 0
};

// Export for reference (not used in runtime, just documentation)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlayerStateSnapshot,
        ClientInputMessage,
        GameStateSnapshot,
        CollisionEvent
    };
}

