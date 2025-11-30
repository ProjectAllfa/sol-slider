// Server-side game configuration - MUST match client config exactly
// This is a copy of public/config/GameConfig.js for server use

const GameConfig = {
    // Canvas settings
    GAME_WIDTH: 1280,
    GAME_HEIGHT: 720,
    
    // Player physics
    PLAYER_MASS: 1.0,
    PLAYER_BOUNCE: 0.4,
    PLAYER_FRICTION: 0.94, // Ice friction (lower = more slippery, lower = stops faster)
    PLAYER_MIN_SPEED: 0, // Velocity threshold to stop completely
    PLAYER_ACCELERATION: 700,
    PLAYER_MAX_SPEED: 1200,
    PLAYER_DECELERATION_START: 100, // Distance from target to start slowing
    PLAYER_STOP_DISTANCE: 1, // Distance from target to stop accelerating
    
    // Dummy physics
    DUMMY_MASS: 1.0,
    DUMMY_BOUNCE: 0.4,
    DUMMY_FRICTION: 0.96, // Slightly higher friction = stops faster
    DUMMY_MIN_SPEED: 0,
    
    // Dash mechanics
    DASH_SPEED: 1000,
    DASH_COOLDOWN: 2000, // milliseconds
    DASH_DURATION: 150, // milliseconds
    DASH_BOOST_FORCE: 1000, // Extra push force when dashing into another player
    DASH_IMPACT_WINDOW: 150, // milliseconds dash can still impact after trigger
    DASH_KNOCKBACK_DURATION: 250, // milliseconds target loses steering after hit
    DASH_RECOIL: 0.3, // Velocity multiplier for dasher on impact (0.3 = keeps 30% speed)
    
    // Collision
    COLLISION_RADIUS_DIVISOR: 2.2, // body dimension / this = collision radius
    COLLISION_OFFSET_X: -8, // Offset to center collision circle
    COLLISION_OFFSET_Y: -8,
    
    // Sprite (for collision body calculations)
    SPRITE_WIDTH: 16 * 2, // 16px sprite * 2 scale
    SPRITE_HEIGHT: 13 * 2, // 13px sprite * 2 scale
    
    // Server settings
    SERVER_UPDATE_RATE: 30, // Updates per second
    SERVER_TICK_RATE: 1000 / 30, // Milliseconds per tick (33.33ms)
    
    // Direction thresholds
    DIRECTION_MIN_SPEED: 5, // Minimum speed to change direction
    DIRECTION_DIAGONAL_THRESHOLD: 0.4, // Ratio for diagonal detection
    
    // Wall destruction
    WALL_DESTRUCTION_MIN_VELOCITY: 500, // Minimum velocity to destroy a wall
    WALL_DESTRUCTION_KNOCKBACK: 800, // Knockback force when hitting a wall
    WALL_TILE_SIZE: 32, // Wall tile size (16px * 2x scale)
    
    // Snowball mechanics
    SNOWBALL_SPEED: 600, // Speed of snowball in pixels per second
    SNOWBALL_RADIUS: 8, // Collision radius of snowball
    SNOWBALL_COOLDOWN: 3000, // Cooldown between throws in milliseconds
    SNOWBALL_FREEZE_DURATION: 3000 // Freeze duration in milliseconds (3 seconds)
};

module.exports = GameConfig;

