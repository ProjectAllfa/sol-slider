// Game configuration - single source of truth for all gameplay values
// These values must be identical on client and server for multiplayer

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
    
    // Visual effects
    TRAIL_LIFETIME: 120, // milliseconds - dash trail fade time
    TRAIL_INTERVAL: 15, // milliseconds - dash trail spawn rate
    TRAIL_FLASH_DURATION: 150, // milliseconds - color flash on character
    TRAIL_COLORS: [0x00ffff, 0xff00ff, 0xffff00], // Cyan, Magenta, Yellow
    
    SKATING_TRAIL_LIFETIME: 1400, // milliseconds
    SKATING_TRAIL_INTERVAL: 10, // milliseconds
    SKATING_TRAIL_WIDTH: 1.2,
    SKATING_TRAIL_COLOR: 0xafd3eb, // Light blue
    SKATING_TRAIL_FOOT_OFFSET: 5, // Distance from center
    SKATING_TRAIL_LENGTH: 5, // Length of trail mark
    SKATING_TRAIL_MIN_SPEED: 10, // Minimum speed to create trails
    
    // Sprite
    SPRITE_SCALE: 2,
    SPRITE_DEPTH: 1,
    SPRITE_WIDTH: 16 * 2,  // base 16px sprite scaled up 2x
    SPRITE_HEIGHT: 13 * 2, // base 13px sprite scaled up 2x
    
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
    SNOWBALL_COOLDOWN: 1000, // Cooldown between throws in milliseconds
    SNOWBALL_FREEZE_DURATION: 3000, // Freeze duration in milliseconds (3 seconds)
    SNOWBALL_SPRITE_SCALE: 2 // Scale for snowball sprite
};

// Freeze config to prevent accidental modifications
Object.freeze(GameConfig);

