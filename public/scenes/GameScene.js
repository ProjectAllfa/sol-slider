// Unified game scene - supports both single-player and multiplayer modes
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Set up loading screen progress tracking
        const loadingScreen = document.getElementById('loading-screen');
        const loadingBar = document.querySelector('.loading-bar');
        
        if (loadingBar) {
            this.load.on('progress', (value) => {
                loadingBar.style.width = (value * 100) + '%';
            });
        }
        
        // Load ice tile for background
        this.load.image('ice_tile', 'assets/map/ice_tile.png');
        
        // Load snow tile for border
        this.load.image('snow_tile', 'assets/map/snow/snow.png');
        this.load.image('snow_bottom_side', 'assets/map/snow/snow_bottom_side.png');
        
        // Load second layer snow tiles (corners and sides)
        this.load.image('snow_top_left_corner', 'assets/map/snow/second_layer/top_left_corner.png');
        this.load.image('snow_top_right_corner', 'assets/map/snow/second_layer/top_right_corner.png');
        this.load.image('snow_bottom_left_corner', 'assets/map/snow/second_layer/bottom_left_corner.png');
        this.load.image('snow_bottom_right_corner', 'assets/map/snow/second_layer/bottom_right_corner.png');
        this.load.image('snow_top_side', 'assets/map/snow/second_layer/top_side.png');
        this.load.image('snow_left_side', 'assets/map/snow/second_layer/left_side.png');
        this.load.image('snow_right_side', 'assets/map/snow/second_layer/right_side.png');
        
        // Load wall tiles (corners and sides)
        // Top-left corner folder
        this.load.image('wall_top_left_corner', 'assets/map/wall/corners/top_left_corner/top_left_corner.png');
        this.load.image('wall_right_next_to_top_left_corner', 'assets/map/wall/corners/top_left_corner/right_next_to_top_left_corner.png');
        this.load.image('wall_below_top_left_corner', 'assets/map/wall/corners/top_left_corner/below_top_left_corner.png');
        
        // Top-right corner folder
        this.load.image('wall_top_right_corner', 'assets/map/wall/corners/top_right_corner/top_right_corner.png');
        this.load.image('wall_next_to_top_right_corner', 'assets/map/wall/corners/top_right_corner/next_to_top_right_corner.png');
        this.load.image('wall_below_top_right_corner', 'assets/map/wall/corners/top_right_corner/below_top_right_corner.png');
        
        // Bottom-left corner folder
        this.load.image('wall_bottom_left_corner', 'assets/map/wall/corners/bottom_left_corner/bottom_left_corner.png');
        this.load.image('wall_next_to_bottom_left_corner', 'assets/map/wall/corners/bottom_left_corner/next_to_bottom_left_corner.png');
        this.load.image('wall_above_bottom_left_corner', 'assets/map/wall/corners/bottom_left_corner/above_bottom_left_corner.png');
        
        // Bottom-right corner folder
        this.load.image('wall_bottom_right_corner', 'assets/map/wall/corners/bottom_right_corner/bottom_right_corner.png');
        this.load.image('wall_left_to_bottom_right_corner', 'assets/map/wall/corners/bottom_right_corner/left_to_bottom_right_corner.png');
        this.load.image('wall_above_bottom_right_corner', 'assets/map/wall/corners/bottom_right_corner/above_bottom_right_corner.png');
        
        // Side tiles
        this.load.image('wall_top_side', 'assets/map/wall/sides/top.png');
        this.load.image('wall_bottom_side', 'assets/map/wall/sides/bottom.png');
        this.load.image('wall_left_side', 'assets/map/wall/sides/left.png');
        this.load.image('wall_right_side', 'assets/map/wall/sides/right.png');
        
        // Load wall destruction animation spritesheet
        // 64x16 spritesheet with 4 frames (16x16 each)
        this.load.spritesheet('wall_destroyed', 'assets/map/wall/wall_destroyed.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        // Load character sprites for all 8 directions
        this.load.image('player_up', 'assets/character/up.png');
        this.load.image('player_down', 'assets/character/down.png');
        this.load.image('player_left', 'assets/character/left.png');
        this.load.image('player_right', 'assets/character/right.png');
        this.load.image('player_up_left', 'assets/character/up_left.png');
        this.load.image('player_up_right', 'assets/character/up_right.png');
        this.load.image('player_down_left', 'assets/character/down_left.png');
        this.load.image('player_down_right', 'assets/character/down_right.png');
        
        // Load snowball sprite
        this.load.image('snowball', 'assets/snowball/snowball.png');
        
        // Load frozen overlay
        this.load.image('frozen', 'assets/snowball/frozen.png');
        
        // Load snowball impact spritesheet
        // 5 frames, each 11x11px, total 55x11px
        this.load.spritesheet('snowball_impact', 'assets/snowball/snowball_impact.png', {
            frameWidth: 11,
            frameHeight: 11
        });
        
        // Load frozen destroyed spritesheet
        // 4 frames, each 16x16px, total 64x16px
        this.load.spritesheet('frozen_destroyed', 'assets/snowball/frozen_destroyed.png', {
            frameWidth: 16,
            frameHeight: 16
        });
        
        // Load arena logo
        this.load.image('arena_logo', 'assets/map/arena_logo.png');
        
        // Load ice mark
        this.load.image('ice_mark', 'assets/map/ice_mark.png');
        
        // Load snowfall images
        this.load.image('snowfall_1', 'assets/map/snowfall/1.png');
        this.load.image('snowfall_2', 'assets/map/snowfall/2.png');
        this.load.image('snowfall_3', 'assets/map/snowfall/3.png');
        this.load.image('snowfall_4', 'assets/map/snowfall/4.png');
        
        // Load arrow pointer for local player indicator
        this.load.image('arrow', 'assets/arrow.png');
        
        // Load click effect spritesheet
        // 204px wide, 50px tall, 4 frames (51px × 50px each)
        this.load.spritesheet('click', 'assets/click.png', {
            frameWidth: 51,
            frameHeight: 50
        });
    }

    create() {
        // Hide loading screen when assets are loaded
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                // Remove from DOM after fade out
                setTimeout(() => {
                    if (loadingScreen && loadingScreen.parentNode) {
                        loadingScreen.parentNode.removeChild(loadingScreen);
                    }
                }, 500);
            }, 300);
        }
        
        // IMPORTANT: Set world bounds FIRST, before creating any physics bodies
        // This ensures consistent boundaries for all players (multiplayer requirement)
        // World bounds must match server-side bounds exactly (1280x720)
        this.physics.world.setBounds(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);
        
        // Set camera bounds to match world bounds exactly
        // This prevents camera from showing areas outside the game world
        this.cameras.main.setBounds(0, 0, GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT);
        
        // No camera zoom needed - game is locked to 1280x720 aspect ratio
        // Phaser.Scale.FIT handles letterboxing automatically
        // Camera shows exactly 1280x720 world at 1:1 scale
        this.cameras.main.setZoom(1);
        this.cameras.main.setScroll(GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2);
        
        // Create game background (covers entire walkable area)
        const gameBackgroundColor = 0x87CEEB; // Sky blue background color
        this.add.rectangle(
            GameConfig.GAME_WIDTH / 2, 
            GameConfig.GAME_HEIGHT / 2, 
            GameConfig.GAME_WIDTH, 
            GameConfig.GAME_HEIGHT, 
            gameBackgroundColor
        ).setDepth(-2); // Behind everything (background layer)
        
        // Create snow tile border around all edges (first layer)
        // Tile is 16x16px, scaled 2x = 32x32px
        const SNOW_TILE_SIZE = 32; // 16px * 2x scale
        
        // Top edge
        this.snowTop = this.add.tileSprite(
            0,
            0,
            GameConfig.GAME_WIDTH,
            SNOW_TILE_SIZE,
            'snow_tile'
        );
        this.snowTop.setOrigin(0, 0);
        this.snowTop.setTileScale(2, 2); // 2x scale (16px -> 32px)
        this.snowTop.setDepth(0); // Above ice tiles, cosmetic only
        
        // Bottom edge (using specific bottom side tile)
        this.snowBottom = this.add.tileSprite(
            0,
            GameConfig.GAME_HEIGHT - SNOW_TILE_SIZE,
            GameConfig.GAME_WIDTH,
            SNOW_TILE_SIZE,
            'snow_bottom_side'
        );
        this.snowBottom.setOrigin(0, 0);
        this.snowBottom.setTileScale(2, 2); // 2x scale (16px -> 32px)
        this.snowBottom.setDepth(0); // Above ice tiles, cosmetic only
        
        // Left edge
        this.snowLeft = this.add.tileSprite(
            0,
            0,
            SNOW_TILE_SIZE,
            GameConfig.GAME_HEIGHT,
            'snow_tile'
        );
        this.snowLeft.setOrigin(0, 0);
        this.snowLeft.setTileScale(2, 2); // 2x scale (16px -> 32px)
        this.snowLeft.setDepth(0); // Above ice tiles, cosmetic only
        
        // Right edge
        this.snowRight = this.add.tileSprite(
            GameConfig.GAME_WIDTH - SNOW_TILE_SIZE,
            0,
            SNOW_TILE_SIZE,
            GameConfig.GAME_HEIGHT,
            'snow_tile'
        );
        this.snowRight.setOrigin(0, 0);
        this.snowRight.setTileScale(2, 2); // 2x scale (16px -> 32px)
        this.snowRight.setDepth(0); // Above ice tiles, cosmetic only
        
        // Create second layer snow tiles (corners and sides) - INSIDE the first layer
        // This creates a nested border effect like an onion
        // Corners are 16x16px, scaled 2x = 32x32px
        const CORNER_SIZE = 32;
        const INNER_OFFSET = SNOW_TILE_SIZE; // Offset inward by one tile (32px)
        
        // Top-left corner (nested inside first layer, aligned with inner border)
        this.snowTopLeftCorner = this.add.image(INNER_OFFSET, INNER_OFFSET, 'snow_top_left_corner');
        this.snowTopLeftCorner.setOrigin(0, 0);
        this.snowTopLeftCorner.setScale(2, 2); // 2x scale
        this.snowTopLeftCorner.setDepth(0.1); // Above first snow layer
        
        // Top-right corner (nested inside first layer, aligned with inner border)
        // Position at inner edge minus corner size, so it aligns properly
        this.snowTopRightCorner = this.add.image(GameConfig.GAME_WIDTH - INNER_OFFSET - CORNER_SIZE, INNER_OFFSET, 'snow_top_right_corner');
        this.snowTopRightCorner.setOrigin(0, 0);
        this.snowTopRightCorner.setScale(2, 2); // 2x scale
        this.snowTopRightCorner.setDepth(0.1);
        
        // Bottom-left corner (nested inside first layer, aligned with inner border)
        this.snowBottomLeftCorner = this.add.image(INNER_OFFSET, GameConfig.GAME_HEIGHT - INNER_OFFSET - CORNER_SIZE, 'snow_bottom_left_corner');
        this.snowBottomLeftCorner.setOrigin(0, 0);
        this.snowBottomLeftCorner.setScale(2, 2); // 2x scale
        this.snowBottomLeftCorner.setDepth(0.1);
        
        // Bottom-right corner (nested inside first layer, aligned with inner border)
        this.snowBottomRightCorner = this.add.image(GameConfig.GAME_WIDTH - INNER_OFFSET - CORNER_SIZE, GameConfig.GAME_HEIGHT - INNER_OFFSET - CORNER_SIZE, 'snow_bottom_right_corner');
        this.snowBottomRightCorner.setOrigin(0, 0);
        this.snowBottomRightCorner.setScale(2, 2); // 2x scale
        this.snowBottomRightCorner.setDepth(0.1);
        
        // Top side (between inner corners, positioned inside first layer)
        this.snowTopSide = this.add.tileSprite(
            INNER_OFFSET + CORNER_SIZE,
            INNER_OFFSET,
            GameConfig.GAME_WIDTH - (INNER_OFFSET * 2) - (CORNER_SIZE * 2),
            CORNER_SIZE,
            'snow_top_side'
        );
        this.snowTopSide.setOrigin(0, 0);
        this.snowTopSide.setTileScale(2, 2); // 2x scale
        this.snowTopSide.setDepth(0.1);
        
        // Left side (between inner corners, positioned inside first layer)
        this.snowLeftSide = this.add.tileSprite(
            INNER_OFFSET,
            INNER_OFFSET + CORNER_SIZE,
            CORNER_SIZE,
            GameConfig.GAME_HEIGHT - (INNER_OFFSET * 2) - (CORNER_SIZE * 2),
            'snow_left_side'
        );
        this.snowLeftSide.setOrigin(0, 0);
        this.snowLeftSide.setTileScale(2, 2); // 2x scale
        this.snowLeftSide.setDepth(0.1);
        
        // Right side (between inner corners, positioned inside first layer)
        this.snowRightSide = this.add.tileSprite(
            GameConfig.GAME_WIDTH - INNER_OFFSET - CORNER_SIZE,
            INNER_OFFSET + CORNER_SIZE,
            CORNER_SIZE,
            GameConfig.GAME_HEIGHT - (INNER_OFFSET * 2) - (CORNER_SIZE * 2),
            'snow_right_side'
        );
        this.snowRightSide.setOrigin(0, 0);
        this.snowRightSide.setTileScale(2, 2); // 2x scale
        this.snowRightSide.setDepth(0.1);
        
        // No bottom side (left empty as requested)
        
        // Create wall tiles (outermost layer, at the edges)
        // Wall tiles are 16x16px, scaled 2x = 32x32px
        const WALL_TILE_SIZE = 32;
        
        // Map to store all wall references for destruction handling
        this.walls = new Map();
        
        // Main corner tiles at the four corners
        // Top-left corner
        this.wallTopLeftCorner = this.add.image(0, 0, 'wall_top_left_corner');
        this.wallTopLeftCorner.setOrigin(0, 0);
        this.wallTopLeftCorner.setScale(2, 2); // 2x scale
        this.wallTopLeftCorner.setDepth(0.2); // Above snow layers
        this.walls.set('top_left_corner', this.wallTopLeftCorner);
        
        // Top-right corner
        this.wallTopRightCorner = this.add.image(GameConfig.GAME_WIDTH, 0, 'wall_top_right_corner');
        this.wallTopRightCorner.setOrigin(1, 0); // Right-aligned
        this.wallTopRightCorner.setScale(2, 2);
        this.wallTopRightCorner.setDepth(0.2);
        this.walls.set('top_right_corner', this.wallTopRightCorner);
        
        // Bottom-left corner
        this.wallBottomLeftCorner = this.add.image(0, GameConfig.GAME_HEIGHT, 'wall_bottom_left_corner');
        this.wallBottomLeftCorner.setOrigin(0, 1); // Bottom-aligned
        this.wallBottomLeftCorner.setScale(2, 2);
        this.wallBottomLeftCorner.setDepth(0.2);
        this.walls.set('bottom_left_corner', this.wallBottomLeftCorner);
        
        // Bottom-right corner
        this.wallBottomRightCorner = this.add.image(GameConfig.GAME_WIDTH, GameConfig.GAME_HEIGHT, 'wall_bottom_right_corner');
        this.wallBottomRightCorner.setOrigin(1, 1); // Right and bottom-aligned
        this.wallBottomRightCorner.setScale(2, 2);
        this.wallBottomRightCorner.setDepth(0.2);
        this.walls.set('bottom_right_corner', this.wallBottomRightCorner);
        
        // Additional corner pieces (adjacent to main corners)
        // Top-left corner adjacent pieces
        // Right next to top-left corner (one tile to the right)
        this.wallRightNextToTopLeft = this.add.image(WALL_TILE_SIZE, 0, 'wall_right_next_to_top_left_corner');
        this.wallRightNextToTopLeft.setOrigin(0, 0);
        this.wallRightNextToTopLeft.setScale(2, 2);
        this.wallRightNextToTopLeft.setDepth(0.2);
        this.walls.set('right_next_to_top_left', this.wallRightNextToTopLeft);
        
        // Below top-left corner (one tile below)
        this.wallBelowTopLeft = this.add.image(0, WALL_TILE_SIZE, 'wall_below_top_left_corner');
        this.wallBelowTopLeft.setOrigin(0, 0);
        this.wallBelowTopLeft.setScale(2, 2);
        this.wallBelowTopLeft.setDepth(0.2);
        this.walls.set('below_top_left', this.wallBelowTopLeft);
        
        // Top-right corner adjacent pieces
        // Next to top-right corner (one tile to the left of the corner)
        // Corner is at (GAME_WIDTH, 0) with origin (1, 0), so its left edge is at GAME_WIDTH - WALL_TILE_SIZE
        // The piece next to it should be one tile to the left of that
        this.wallNextToTopRight = this.add.image(GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2), 0, 'wall_next_to_top_right_corner');
        this.wallNextToTopRight.setOrigin(0, 0);
        this.wallNextToTopRight.setScale(2, 2);
        this.wallNextToTopRight.setDepth(0.2);
        this.walls.set('next_to_top_right', this.wallNextToTopRight);
        
        // Below top-right corner (directly below the corner)
        // Corner's bottom-left is at (GAME_WIDTH - WALL_TILE_SIZE, WALL_TILE_SIZE)
        this.wallBelowTopRight = this.add.image(GameConfig.GAME_WIDTH - WALL_TILE_SIZE, WALL_TILE_SIZE, 'wall_below_top_right_corner');
        this.wallBelowTopRight.setOrigin(0, 0);
        this.wallBelowTopRight.setScale(2, 2);
        this.wallBelowTopRight.setDepth(0.2);
        this.walls.set('below_top_right', this.wallBelowTopRight);
        
        // Bottom-left corner adjacent pieces
        // Next to bottom-left corner (one tile to the right)
        this.wallNextToBottomLeft = this.add.image(WALL_TILE_SIZE, GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, 'wall_next_to_bottom_left_corner');
        this.wallNextToBottomLeft.setOrigin(0, 0);
        this.wallNextToBottomLeft.setScale(2, 2);
        this.wallNextToBottomLeft.setDepth(0.2);
        this.walls.set('next_to_bottom_left', this.wallNextToBottomLeft);
        
        // Above bottom-left corner (one tile above the bottom-left corner)
        this.wallAboveBottomLeft = this.add.image(0, GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2), 'wall_above_bottom_left_corner');
        this.wallAboveBottomLeft.setOrigin(0, 0);
        this.wallAboveBottomLeft.setScale(2, 2);
        this.wallAboveBottomLeft.setDepth(0.2);
        this.walls.set('above_bottom_left', this.wallAboveBottomLeft);
        
        // Bottom-right corner adjacent pieces
        // Left to bottom-right corner (one tile to the left of bottom-right corner, same Y position)
        this.wallLeftToBottomRight = this.add.image(GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2), GameConfig.GAME_HEIGHT, 'wall_left_to_bottom_right_corner');
        this.wallLeftToBottomRight.setOrigin(0, 1); // Bottom-aligned to match corner
        this.wallLeftToBottomRight.setScale(2, 2);
        this.wallLeftToBottomRight.setDepth(0.2);
        this.walls.set('left_to_bottom_right', this.wallLeftToBottomRight);
        
        // Above bottom-right corner (one tile above)
        this.wallAboveBottomRight = this.add.image(GameConfig.GAME_WIDTH - WALL_TILE_SIZE, GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2), 'wall_above_bottom_right_corner');
        this.wallAboveBottomRight.setOrigin(0, 0);
        this.wallAboveBottomRight.setScale(2, 2);
        this.wallAboveBottomRight.setDepth(0.2);
        this.walls.set('above_bottom_right', this.wallAboveBottomRight);
        
        // Side tiles - create individual tiles (not TileSprites) so each can be destroyed independently
        // Top side (starts after top-left corner + adjacent piece, ends before top-right corner + adjacent piece)
        const topSideStartX = WALL_TILE_SIZE * 2;
        const topSideEndX = GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2);
        const topSideTileCount = Math.floor((topSideEndX - topSideStartX) / WALL_TILE_SIZE);
        for (let i = 0; i < topSideTileCount; i++) {
            const tile = this.add.image(topSideStartX + (i * WALL_TILE_SIZE), 0, 'wall_top_side');
            tile.setOrigin(0, 0);
            tile.setScale(2, 2);
            tile.setDepth(0.2);
            this.walls.set(`top_side_${i}`, tile);
        }
        
        // Bottom side
        const bottomSideStartX = WALL_TILE_SIZE * 2;
        const bottomSideEndX = GameConfig.GAME_WIDTH - (WALL_TILE_SIZE * 2);
        const bottomSideTileCount = Math.floor((bottomSideEndX - bottomSideStartX) / WALL_TILE_SIZE);
        for (let i = 0; i < bottomSideTileCount; i++) {
            const tile = this.add.image(bottomSideStartX + (i * WALL_TILE_SIZE), GameConfig.GAME_HEIGHT - WALL_TILE_SIZE, 'wall_bottom_side');
            tile.setOrigin(0, 0);
            tile.setScale(2, 2);
            tile.setDepth(0.2);
            this.walls.set(`bottom_side_${i}`, tile);
        }
        
        // Left side
        // Starts after "below top-left" which ends at Y = WALL_TILE_SIZE * 2 (64px)
        // Should extend all the way to where "above bottom-left" starts
        // "above bottom-left" is at Y = GAME_HEIGHT - (WALL_TILE_SIZE * 2), so side tiles should end there
        const leftSideStartY = WALL_TILE_SIZE * 2; // 64px - right after "below top-left"
        const leftSideEndY = GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2); // GAME_HEIGHT - 64px - where "above bottom-left" starts
        // Calculate how many full tiles fit, then add one more to fill the gap
        const leftSideAvailableSpace = leftSideEndY - leftSideStartY;
        const leftSideTileCount = Math.ceil(leftSideAvailableSpace / WALL_TILE_SIZE); // Use ceil to ensure we fill the space
        for (let i = 0; i < leftSideTileCount; i++) {
            const tile = this.add.image(0, leftSideStartY + (i * WALL_TILE_SIZE), 'wall_left_side');
            tile.setOrigin(0, 0);
            tile.setScale(2, 2);
            tile.setDepth(0.2);
            this.walls.set(`left_side_${i}`, tile);
        }
        
        // Right side
        // Starts after "below top-right" which ends at Y = WALL_TILE_SIZE * 2 (64px)
        // Should extend all the way to where "above bottom-right" starts
        // "above bottom-right" is at Y = GAME_HEIGHT - (WALL_TILE_SIZE * 2), so side tiles should end there
        const rightSideStartY = WALL_TILE_SIZE * 2; // 64px - right after "below top-right"
        const rightSideEndY = GameConfig.GAME_HEIGHT - (WALL_TILE_SIZE * 2); // GAME_HEIGHT - 64px - where "above bottom-right" starts
        // Calculate how many full tiles fit, then add one more to fill the gap
        const rightSideAvailableSpace = rightSideEndY - rightSideStartY;
        const rightSideTileCount = Math.ceil(rightSideAvailableSpace / WALL_TILE_SIZE); // Use ceil to ensure we fill the space
        for (let i = 0; i < rightSideTileCount; i++) {
            const tile = this.add.image(GameConfig.GAME_WIDTH - WALL_TILE_SIZE, rightSideStartY + (i * WALL_TILE_SIZE), 'wall_right_side');
            tile.setOrigin(0, 0);
            tile.setScale(2, 2);
            tile.setDepth(0.2);
            this.walls.set(`right_side_${i}`, tile);
        }
        
        // Create ice tile pattern covering the entire game area
        // TileSprite automatically repeats the texture to fill the specified size
        this.iceTiles = this.add.tileSprite(
            0, 
            0, 
            GameConfig.GAME_WIDTH, 
            GameConfig.GAME_HEIGHT, 
            'ice_tile'
        );
        this.iceTiles.setOrigin(0, 0); // Set origin to top-left corner
        this.iceTiles.setDepth(-1); // Above background color, below everything else
        
        // Create arena logo in center
        this.arenaLogo = this.add.image(
            GameConfig.GAME_WIDTH / 2,
            GameConfig.GAME_HEIGHT / 2,
            'arena_logo'
        );
        this.arenaLogo.setOrigin(0.5, 0.5); // Center origin
        this.arenaLogo.setDepth(-0.5); // Above ice tiles (-1), below everything else
        this.arenaLogo.setAlpha(0.4); // 0.4 opacity
        
        // Create diagonal ice mark pattern (right to left)
        // Store marks for potential cleanup
        this.iceMarks = [];
        
        // Logo exclusion zone (estimate logo size, adjust if needed)
        const logoCenterX = GameConfig.GAME_WIDTH / 2;
        const logoCenterY = GameConfig.GAME_HEIGHT / 2;
        const logoExclusionRadius = 200; // Exclusion radius around logo center
        
        // Top offset to avoid snow tiles (1 tile = 32px, using same value as SNOW_TILE_SIZE defined earlier)
        const topOffset = 64; // Start 1 tile lower from top
        
        // Diagonal line parameters
        const markSpacing = 160; // Spacing between marks along the diagonal (doubled for 2x size)
        const lineSpacing = 110; // Spacing between parallel diagonal lines (doubled for 2x size)
        const diagonalAngle = -45; // Angle for diagonal from right to left (degrees)
        const diagonalAngleRad = Phaser.Math.DegToRad(diagonalAngle);
        
        // Create multiple parallel diagonal lines
        // Calculate how many lines we need to cover the arena
        const arenaDiagonal = Math.sqrt(GameConfig.GAME_WIDTH ** 2 + GameConfig.GAME_HEIGHT ** 2);
        const numLines = Math.ceil(arenaDiagonal / lineSpacing) + 10; // Extra lines to ensure coverage
        
        for (let lineIndex = 0; lineIndex < numLines; lineIndex++) {
            // Offset each line perpendicular to the diagonal direction
            const perpAngle = diagonalAngleRad + Math.PI / 2;
            const lineOffset = (lineIndex - numLines / 2) * lineSpacing;
            
            // Calculate starting point for this diagonal line
            // Start from right side and go to left
            // Offset downward from top to avoid snow tiles
            let startX = GameConfig.GAME_WIDTH;
            let startY = lineIndex * lineSpacing - (numLines / 2) * lineSpacing + GameConfig.GAME_HEIGHT / 2 + topOffset;
            
            // Adjust start position to ensure line goes from right to left across the arena
            // Project the offset perpendicular to the diagonal
            startX += Math.cos(perpAngle) * lineOffset;
            startY += Math.sin(perpAngle) * lineOffset;
            
            // Create marks along this diagonal line
            const numMarks = Math.ceil(arenaDiagonal / markSpacing);
            for (let markIndex = 0; markIndex < numMarks; markIndex++) {
                // Position along the diagonal
                const markX = startX - markIndex * markSpacing * Math.cos(diagonalAngleRad);
                const markY = startY - markIndex * markSpacing * Math.sin(diagonalAngleRad);
                
                // Skip if outside arena bounds (accounting for top snow tiles)
                if (markX < 0 || markX > GameConfig.GAME_WIDTH || 
                    markY < topOffset || markY > GameConfig.GAME_HEIGHT) {
                    continue;
                }
                
                // Skip if too close to logo center
                const dx = markX - logoCenterX;
                const dy = markY - logoCenterY;
                const distanceToLogo = Math.sqrt(dx * dx + dy * dy);
                if (distanceToLogo < logoExclusionRadius) {
                    continue;
                }
                
                // Create ice mark
                const mark = this.add.image(markX, markY, 'ice_mark');
                mark.setOrigin(0.5, 0.5);
                mark.setScale(2, 2); // 2x size
                mark.setAlpha(0.8); // 0.5 opacity
                mark.setDepth(-0.5); // Same depth as logo
                this.iceMarks.push(mark);
            }
        }
        
        // Create wall destruction animation
        // 4 frames, 16x16 each, plays once and doesn't repeat
        this.anims.create({
            key: 'wall_destroy',
            frames: this.anims.generateFrameNumbers('wall_destroyed', { start: 0, end: 3 }),
            frameRate: 14, // 10 frames per second
            repeat: 0 // Play once, don't repeat
        });
        
        // Create snowball impact animation
        // 5 frames, 11x11 each, plays once and doesn't repeat
        this.anims.create({
            key: 'snowball_impact',
            frames: this.anims.generateFrameNumbers('snowball_impact', { start: 0, end: 4 }),
            frameRate: 20, // 20 frames per second (5 frames = 0.25 seconds)
            repeat: 0 // Play once, don't repeat
        });
        
        // Create frozen destroyed animation
        // 4 frames, 16x16 each, plays once and doesn't repeat
        this.anims.create({
            key: 'frozen_destroyed',
            frames: this.anims.generateFrameNumbers('frozen_destroyed', { start: 0, end: 3 }),
            frameRate: 18, // 16 frames per second (4 frames = 0.25 seconds)
            repeat: 0 // Play once, don't repeat
        });
        
        // Create click effect animation
        this.anims.create({
            key: 'click',
            frames: this.anims.generateFrameNumbers('click', { start: 0, end: 3 }),
            frameRate: 12,
            repeat: 0
        });
        
        // Initialize mode flags
        this.isMultiplayer = false;
        this.localPlayer = null;
        this.remotePlayers = new Map(); // playerId -> RemotePlayer (multiplayer only)
        this.dummy = null; // Single-player only
        this.explosions = []; // Array to track active explosion effects
        this.snowballs = new Map(); // snowballId -> Snowball (multiplayer only)
        this.snowballImpacts = []; // Array to track active snowball impact effects
        this.frozenDestroyedEffects = []; // Array to track active frozen destroyed effects
        this.gameEnded = false; // Flag to freeze game when round ends
        
        // Store scene reference globally for join button
        window.gameScene = this;
        
        // Set game scene in client round manager
        if (window.clientRoundManager) {
            window.clientRoundManager.setGameScene(this);
        }
        
        // Check if we should use multiplayer mode
        // Multiplayer requires socket.io to be available
        // You can force single-player with ?singleplayer=true URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        const singlePlayerParam = urlParams.get('singleplayer');
        
        // Start in spectator mode by default (don't auto-connect)
        // User must click "Join Game" button to connect
        // Only auto-connect if forced to single-player mode
        if (singlePlayerParam === 'true') {
            this.initSinglePlayer();
        } else {
            // Start in spectator mode - connect to view game but don't create player
            this.isMultiplayer = false;
            this.isSpectator = true;
            console.log('[Game] Started in spectator mode - click "Join Game" to play');
            
            // Connect as spectator to receive game updates
            this.initSpectator();
        }
        
        // Common setup
        this.input.mouse.disableContextMenu();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        
        // Initialize snowfall effect
        this.initSnowfall();
    }
    
    initSnowfall() {
        // Array to store all snowflakes
        this.snowflakes = [];
        
        // Snowfall configuration
        const SNOWFLAKE_COUNT = 60; // Number of snowflakes
        const SNOWFALL_SPEED_MIN = 100; // Minimum fall speed (pixels per second)
        const SNOWFALL_SPEED_MAX = 120; // Maximum fall speed (pixels per second)
        const BLIZZARD_WIND_SPEED = -20; // Leftward wind speed (pixels per second, negative = left)
        const SNOWFALL_DRIFT_MIN = -15; // Minimum horizontal drift variation (pixels per second)
        const SNOWFALL_DRIFT_MAX = 5; // Maximum horizontal drift variation (pixels per second)
        
        // Available snowfall textures
        const snowfallTextures = ['snowfall_1', 'snowfall_2', 'snowfall_3', 'snowfall_4'];
        
        // Create snowflakes
        for (let i = 0; i < SNOWFLAKE_COUNT; i++) {
            // Random starting position
            const startX = Phaser.Math.Between(0, GameConfig.GAME_WIDTH);
            const startY = Phaser.Math.Between(-GameConfig.GAME_HEIGHT, 0); // Start above screen
            
            // Random texture
            const textureKey = Phaser.Utils.Array.GetRandom(snowfallTextures);
            
            // Create snowflake sprite
            const snowflake = this.add.image(startX, startY, textureKey);
            
            // Random properties for variation (speed, drift, and size)
            const fallSpeed = Phaser.Math.FloatBetween(SNOWFALL_SPEED_MIN, SNOWFALL_SPEED_MAX);
            // Drift speed is variation on top of the blizzard wind (mostly leftward)
            const driftSpeed = Phaser.Math.FloatBetween(SNOWFALL_DRIFT_MIN, SNOWFALL_DRIFT_MAX);
            // Size variance between 0.5 and 0.8
            const scale = Phaser.Math.FloatBetween(0.6, 0.8);
            
            // Apply properties
            snowflake.setScale(scale);
            snowflake.setAlpha(1.0);
            snowflake.setDepth(1.2); // Above all tiles (walls are 0.2) and players (1.0-1.1)
            
            // Store properties for update loop
            snowflake.snowfallData = {
                fallSpeed: fallSpeed,
                driftSpeed: driftSpeed,
                textureKey: textureKey
            };
            
            this.snowflakes.push(snowflake);
        }
    }
    
    // setupCameraZoom() removed - no longer needed
    // Game is locked to 1280x720 aspect ratio with Phaser.Scale.FIT
    // Letterboxing is handled automatically by Phaser

    initSinglePlayer() {
        console.log('[Game] Initializing single-player mode');
        
        // Create player at center of screen
        this.localPlayer = new Player(this, GameConfig.GAME_WIDTH / 2, GameConfig.GAME_HEIGHT / 2);
        
        // Initialize trail effect for player
        this.localPlayer.trailEffect = new TrailEffect(this, this.localPlayer);
        
        // Initialize skating trail for player
        this.localPlayer.skatingTrail = new SkatingTrail(this, this.localPlayer);
        
        // Initialize frozen overlay for player
        this.localPlayer.frozenOverlay = this.add.image(
            this.localPlayer.x,
            this.localPlayer.y,
            'frozen'
        );
        this.localPlayer.frozenOverlay.setScale(GameConfig.SPRITE_SCALE);
        this.localPlayer.frozenOverlay.setOrigin(0.5, 0.5);
        this.localPlayer.frozenOverlay.setDepth(GameConfig.SPRITE_DEPTH + 0.1);
        this.localPlayer.frozenOverlay.setVisible(false);
        
        // Initialize arrow indicator above player head (local player only)
        this.localPlayer.arrowIndicator = this.add.image(
            this.localPlayer.x,
            this.localPlayer.y - (this.localPlayer.height / 2) - 20,
            'arrow'
        );
        this.localPlayer.arrowIndicator.setOrigin(0.5, 0.5);
        this.localPlayer.arrowIndicator.setDepth(GameConfig.SPRITE_DEPTH + 0.2); // Above player sprite
        this.localPlayer.arrowIndicator.setScale(1.5); // Slightly larger for visibility
        
        // Camera is set up in setupCameraZoom() to show entire world
        // No camera following - entire 1280x720 world is always visible
        
        // Create dummy for testing (can be pushed around)
        this.dummy = new Dummy(this, 500, 300);
        
        // Set up collider - physics will handle natural pushing based on mass/velocity
        // Add callback to boost push when dashing
        this.physics.add.collider(
            this.localPlayer, 
            this.dummy,
            (player, dummy) => {
                // Natural physics handles basic pushing
                // Add extra boost when dashing
                if (player.isDashing) {
                    // Calculate push direction
                    const angle = Phaser.Math.Angle.Between(player.x, player.y, dummy.x, dummy.y);
                    
                    // Add velocity boost in collision direction
                    dummy.body.velocity.x += Math.cos(angle) * GameConfig.DASH_BOOST_FORCE;
                    dummy.body.velocity.y += Math.sin(angle) * GameConfig.DASH_BOOST_FORCE;
                }
            },
            null,
            this
        );
        
        // Right click to move (local only)
        this.input.on('pointerdown', (pointer) => {
            if (!this.localPlayer) return;
            
            // Frozen players cannot move
            if (this.localPlayer.isFrozen) {
                return;
            }
            
            if (pointer.rightButtonDown()) {
                this.localPlayer.setTarget(pointer.worldX, pointer.worldY);
                // Show click effect at click location
                this.showClickEffect(pointer.worldX, pointer.worldY);
            }
        });
        
        // Initialize frozen overlay for local player (after player is created)
        if (this.localPlayer) {
            this.localPlayer.frozenOverlay = this.add.image(
                this.localPlayer.x,
                this.localPlayer.y,
                'frozen'
            );
            this.localPlayer.frozenOverlay.setScale(GameConfig.SPRITE_SCALE);
            this.localPlayer.frozenOverlay.setOrigin(0.5, 0.5);
            this.localPlayer.frozenOverlay.setDepth(GameConfig.SPRITE_DEPTH + 0.1);
            this.localPlayer.frozenOverlay.setVisible(false);
            
            // Initialize arrow indicator above player head (local player only)
            this.localPlayer.arrowIndicator = this.add.image(
                this.localPlayer.x,
                this.localPlayer.y - (this.localPlayer.height / 2) - 20,
                'arrow'
            );
            this.localPlayer.arrowIndicator.setOrigin(0.5, 0.5);
            this.localPlayer.arrowIndicator.setDepth(GameConfig.SPRITE_DEPTH + 0.2); // Above player sprite
            this.localPlayer.arrowIndicator.setScale(1.5); // Slightly larger for visibility
        }
    }

    initSpectator() {
        // Connect as spectator to view game without creating a player
        if (this.network) {
            console.log('[Game] Already connected as spectator');
            return;
        }
        
        console.log('[Game] Connecting as spectator');
        this.isSpectator = true;
        
        // Initialize network manager
        this.network = new NetworkManager(this);
        
        // Set up network callbacks (spectator mode - no local player)
        this.network.onGameInit = (data) => {
            // Don't create local player if spectator
            if (data.isSpectator || !data.playerId) {
                console.log('[Game] Received game state as spectator', data);
                // Handle game state to show all players
                if (data.gameState) {
                    // Create all remote players from initial game state
                    if (data.gameState.players) {
                        for (const [playerId, playerState] of Object.entries(data.gameState.players)) {
                            // Create remote player for each player in the game
                            if (!this.remotePlayers.has(playerId)) {
                                console.log('[Game] Creating remote player for spectator:', playerId);
                                this.createRemotePlayer(playerState);
                            }
                        }
                    }
                    // Also process the game state update
                    this.handleGameUpdate(data.gameState);
                }
            } else {
                // Actually joining as player
                this.handleGameInit(data);
            }
        };
        this.network.onGameUpdate = (gameState) => {
            // Spectators receive game updates just like players
            this.handleGameUpdate(gameState);
        };
        this.network.onPlayerJoined = (playerState) => this.handlePlayerJoined(playerState);
        this.network.onPlayerLeft = (playerId) => this.handlePlayerLeft(playerId);
        this.network.onPlayerEliminated = (playerId) => this.handlePlayerEliminated(playerId);
        this.network.onWallDestroyed = (wallId) => this.handleWallDestroyed(wallId);
        this.network.onWallsReset = () => this.restoreAllWalls();
        this.network.onSnowballImpact = (x, y) => this.handleSnowballImpact(x, y);
        this.network.onFrozenDestroyed = (playerId, x, y) => this.handleFrozenDestroyed(playerId, x, y);
        this.network.onGameEnd = (data) => this.handleGameEnd(data);
        
        // Connect to server (automatically connects as spectator)
        this.network.connect();
    }

    setupMultiplayerInput() {
        // Set up input handlers for multiplayer (only once)
        if (this.multiplayerInputSetup) {
            return; // Already set up
        }
        
        // Right click to move (send to server)
        // Left click to throw snowball
        this.input.on('pointerdown', (pointer) => {
            if (!this.localPlayer) return;
            
            // Frozen players cannot move or throw snowballs
            if (this.localPlayer.isFrozen) {
                return;
            }
            
            if (pointer.rightButtonDown()) {
                // Send movement to server
                if (this.network && this.network.sendMove) {
                    this.network.sendMove(pointer.worldX, pointer.worldY);
                }
                
                // Also apply locally for immediate feedback (client prediction)
                this.localPlayer.setTarget(pointer.worldX, pointer.worldY);
                
                // Show click effect at click location
                this.showClickEffect(pointer.worldX, pointer.worldY);
            }
            
            if (pointer.leftButtonDown()) {
                // Throw snowball at target position
                if (this.isMultiplayer && this.network && this.network.sendThrowSnowball) {
                    this.network.sendThrowSnowball(pointer.worldX, pointer.worldY);
                }
            }
        });
        
        this.multiplayerInputSetup = true;
    }

    initMultiplayer() {
        console.log('[Game] Joining queue for next round');
        this.isMultiplayer = true;
        this.isSpectator = false;
        
        // Set up input handlers (always, even if already connected)
        this.setupMultiplayerInput();
        
        // If already connected as spectator, request to join queue
        if (this.network && this.network.socket) {
            // Already connected, just need to join queue
            if (window.userData) {
                this.network.socket.emit('player:join', {
                    username: window.userData.username,
                    publicWallet: window.userData.publicWallet
                });
            } else {
                this.network.socket.emit('player:join');
            }
            
            // Listen for queue confirmation
            this.network.socket.once('player:queued', (data) => {
                console.log('[Game] Added to queue:', data.message);
            });
            return;
        }
        
        // Not connected yet, initialize network manager
        this.network = new NetworkManager(this);
        
        // Set up network callbacks
        this.network.onGameInit = (data) => {
            if (!data.isSpectator && data.playerId) {
                this.handleGameInit(data);
            }
        };
        this.network.onGameUpdate = (gameState) => this.handleGameUpdate(gameState);
        this.network.onPlayerJoined = (playerState) => this.handlePlayerJoined(playerState);
        this.network.onPlayerLeft = (playerId) => this.handlePlayerLeft(playerId);
        this.network.onPlayerEliminated = (playerId) => this.handlePlayerEliminated(playerId);
        this.network.onWallDestroyed = (wallId) => this.handleWallDestroyed(wallId);
        this.network.onWallsReset = () => this.restoreAllWalls();
        this.network.onSnowballImpact = (x, y) => this.handleSnowballImpact(x, y);
        this.network.onFrozenDestroyed = (playerId, x, y) => this.handleFrozenDestroyed(playerId, x, y);
        this.network.onGameEnd = (data) => this.handleGameEnd(data);
        
        // Connect to server (will connect as spectator first)
        this.network.connect();
        
        // Request to join queue after connection
        this.network.socket.on('connect', () => {
            if (window.userData) {
                this.network.socket.emit('player:join', {
                    username: window.userData.username,
                    publicWallet: window.userData.publicWallet
                });
            } else {
                this.network.socket.emit('player:join');
            }
            
            // Listen for queue confirmation
            this.network.socket.once('player:queued', (data) => {
                console.log('[Game] Added to queue:', data.message);
            });
        });
    }

    handleGameUpdate(gameState) {
        // Skip player state updates if game has ended, but allow other updates
        if (this.gameEnded) {
            // Don't update player positions/movement, but other updates can continue
            return;
        }
        
        // Update all players from server state
        if (!gameState || !gameState.players) {
            return; // No players in game state
        }
        
        for (const [playerId, playerState] of Object.entries(gameState.players)) {
            // For spectators, all players are remote players (localPlayerId is null)
            // For players, only non-local players are remote
            const isLocal = this.network && this.network.isLocalPlayer && this.network.isLocalPlayer(playerId);
            
            if (isLocal && this.localPlayer) {
                // Update local player with server correction
                this.reconcileLocalPlayer(playerState);
                // Update frozen state
                if (playerState.isFrozen !== undefined) {
                    this.localPlayer.setFrozen(playerState.isFrozen);
                }
            } else {
                // Update or create remote player (for spectators, all players go here)
                let remotePlayer = this.remotePlayers.get(playerId);
                if (!remotePlayer) {
                    // Create remote player if it doesn't exist (for spectators or late joiners)
                    console.log('[Game] Creating missing remote player:', playerId);
                    remotePlayer = this.createRemotePlayer(playerState);
                } else {
                    // Update existing remote player with server state
                    remotePlayer.updateFromServer(playerState);
                }
            }
        }
        
        // Remove players that no longer exist on server
        const serverPlayerIds = new Set(Object.keys(gameState.players));
        for (const [playerId, remotePlayer] of this.remotePlayers.entries()) {
            if (!serverPlayerIds.has(playerId)) {
                remotePlayer.destroy();
                this.remotePlayers.delete(playerId);
            }
        }
        
        // Update snowballs from server state
        if (gameState.snowballs) {
            // Get all snowball IDs from server
            const serverSnowballIds = new Set(Object.keys(gameState.snowballs));
            
            // Remove snowballs that no longer exist on server
            for (const [snowballId, snowball] of this.snowballs.entries()) {
                if (!serverSnowballIds.has(snowballId)) {
                    snowball.destroy();
                    this.snowballs.delete(snowballId);
                }
            }
            
            // Update or create snowballs
            for (const [snowballId, snowballState] of Object.entries(gameState.snowballs)) {
                let snowball = this.snowballs.get(snowballId);
                if (!snowball) {
                    // Create new snowball at server position
                    snowball = new Snowball(this, snowballState.x, snowballState.y);
                    snowball.snowballId = snowballId;
                    // Initialize with server state immediately
                    snowball.updateFromServer(snowballState);
                    this.snowballs.set(snowballId, snowball);
                } else {
                    // Update existing snowball state
                    snowball.updateFromServer(snowballState);
                }
            }
        }
    }

    handlePlayerJoined(playerState) {
        // Don't create if it's us (already created)
        if (this.network.isLocalPlayer(playerState.id)) return;
        
        // Create new remote player
        this.createRemotePlayer(playerState);
    }

    handlePlayerLeft(playerId) {
        // If local player left, reset multiplayer state
        if (this.network && this.network.isLocalPlayer(playerId)) {
            // Reset multiplayer state
            this.isMultiplayer = false;
            this.isSpectator = true;
            this.localPlayer = null;
        } else {
            // Remove remote player
            const remotePlayer = this.remotePlayers.get(playerId);
            if (remotePlayer) {
                remotePlayer.destroy();
                this.remotePlayers.delete(playerId);
            }
        }
    }
    
    handleGameEnd(data) {
        console.log('[Game] Game ended - freezing for 5 seconds before removing players');
        
        // Notify chat manager that game ended (can show chat again)
        if (window.chatManager) {
            window.chatManager.setGameActive(false);
        }
        
        // Freeze the game - disable player input and updates
        this.gameEnded = true;
        
        // Set flag on local player to prevent any updates
        if (this.localPlayer) {
            this.localPlayer.gameEnded = true;
            
            // Completely disable Phaser physics body
            if (this.localPlayer.body) {
                this.localPlayer.body.setVelocity(0, 0);
                this.localPlayer.body.setAcceleration(0, 0);
                this.localPlayer.body.setImmovable(true); // Prevent physics from moving it
            }
        }
        
        // Set flag on all remote players
        for (const remotePlayer of this.remotePlayers.values()) {
            remotePlayer.gameEnded = true;
        }
        
        // Wait 5 seconds before removing players (game is frozen on server)
        this.time.delayedCall(5000, () => {
            // Remove local player if exists
            if (this.localPlayer) {
                this.localPlayer.destroy();
                this.localPlayer = null;
            }
            
            // Remove all remote players
            for (const [playerId, remotePlayer] of this.remotePlayers.entries()) {
                remotePlayer.destroy();
            }
            this.remotePlayers.clear();
            
            // Remove all snowballs
            for (const [snowballId, snowball] of this.snowballs.entries()) {
                snowball.destroy();
            }
            this.snowballs.clear();
            
            // Reset to spectator mode
            this.isMultiplayer = false;
            this.isSpectator = true;
            
            // Reset game ended flag
            this.gameEnded = false;
            
            // Clear game ended flag on all players
            if (this.localPlayer) {
                this.localPlayer.gameEnded = false;
            }
            for (const remotePlayer of this.remotePlayers.values()) {
                remotePlayer.gameEnded = false;
            }
            
            console.log(`[Game] Removed all players. Winners: ${data.winners ? data.winners.length : 0}`);
        });
    }
    
    handleGameInit(data) {
        console.log('[Game] Initializing with player ID:', data.playerId);
        
        // Notify chat manager that game is active
        if (window.chatManager) {
            window.chatManager.setGameActive(true);
        }
        
        // Ensure input handlers are set up (in case they weren't set up earlier)
        if (this.isMultiplayer) {
            this.setupMultiplayerInput();
        }
        
        // Restore all walls first (in case they were destroyed in previous round)
        this.restoreAllWalls();
        
        // Apply initial wall state from server
        if (data.gameState.walls) {
            for (const [wallId, destroyed] of Object.entries(data.gameState.walls)) {
                if (destroyed) {
                    this.destroyWall(wallId);
                }
            }
        }
        
        // Create all players from initial game state
        for (const [playerId, playerState] of Object.entries(data.gameState.players)) {
            if (this.network.isLocalPlayer(playerId)) {
                // Only create local player if it doesn't exist
                if (!this.localPlayer) {
                    this.createLocalPlayer(playerState);
                }
            } else {
                // Only create remote player if it doesn't exist
                if (!this.remotePlayers.has(playerId)) {
                    this.createRemotePlayer(playerState);
                } else {
                    // Update existing remote player with new state
                    const existingPlayer = this.remotePlayers.get(playerId);
                    existingPlayer.updateFromServer(playerState);
                }
            }
        }
        
        // Create all snowballs from initial game state
        if (data.gameState.snowballs) {
            for (const [snowballId, snowballState] of Object.entries(data.gameState.snowballs)) {
                const snowball = new Snowball(this, snowballState.x, snowballState.y);
                snowball.snowballId = snowballId;
                // Initialize with server state immediately
                snowball.updateFromServer(snowballState);
                this.snowballs.set(snowballId, snowball);
            }
        }
    }
    
    handlePlayerEliminated(playerId) {
        // Trigger screen shake for all players when someone falls off
        this.triggerScreenShake();
        
        // Check if it's the local player
        if (this.network.isLocalPlayer(playerId)) {
            this.handleLocalPlayerEliminated();
        } else {
            // Remove remote player and create explosion
            const remotePlayer = this.remotePlayers.get(playerId);
            if (remotePlayer) {
                // Create explosion at remote player's position
                const explosion = new ExplosionEffect(this, remotePlayer.x, remotePlayer.y);
                this.explosions.push(explosion);
                
                remotePlayer.destroy();
                this.remotePlayers.delete(playerId);
            }
        }
    }
    
    handleWallDestroyed(wallId) {
        this.destroyWall(wallId);
    }
    
    handleSnowballImpact(x, y) {
        // Create snowball impact effect at hit position
        const impact = new SnowballImpactEffect(this, x, y);
        this.snowballImpacts.push(impact);
    }
    
    handleFrozenDestroyed(playerId, x, y) {
        // Create frozen destroyed effect at player position
        const effect = new FrozenDestroyedEffect(this, x, y);
        this.frozenDestroyedEffects.push(effect);
    }
    
    destroyWall(wallId) {
        const wall = this.walls.get(wallId);
        if (wall && wall.visible) {
            // Get wall's top-left corner position (regardless of origin)
            // This ensures the animation aligns correctly with the wall
            const wallTopLeft = wall.getTopLeft();
            
            // Create destruction animation sprite at wall's top-left position
            const destroySprite = this.add.sprite(wallTopLeft.x, wallTopLeft.y, 'wall_destroyed');
            destroySprite.setOrigin(0, 0); // Always use top-left origin for alignment
            destroySprite.setScale(2, 2); // Match wall scale (2x)
            destroySprite.setDepth(0.2); // Same depth as walls
            
            // Play destruction animation
            destroySprite.play('wall_destroy');
            
            // Remove the sprite when animation completes
            destroySprite.on('animationcomplete', () => {
                destroySprite.destroy();
            });
            
            // Hide the original wall
            wall.setVisible(false);
            wall.setActive(false);
        }
    }
    
    restoreWall(wallId) {
        const wall = this.walls.get(wallId);
        if (wall && !wall.visible) {
            // Restore the wall visibility
            wall.setVisible(true);
            wall.setActive(true);
        }
    }
    
    restoreAllWalls() {
        // Restore all walls to their initial state
        for (const [wallId, wall] of this.walls.entries()) {
            if (!wall.visible) {
                wall.setVisible(true);
                wall.setActive(true);
            }
        }
    }
    
    handleLocalPlayerEliminated() {
        // Trigger screen shake for single-player mode (multiplayer already triggers it in handlePlayerEliminated)
        if (!this.isMultiplayer) {
            this.triggerScreenShake();
        }
        
        // Create explosion at player's position before they're eliminated
        if (this.localPlayer) {
            const explosion = new ExplosionEffect(this, this.localPlayer.x, this.localPlayer.y);
            this.explosions.push(explosion);
        }
        
        // Notify chat manager that game ended (can show chat again)
        if (window.chatManager) {
            window.chatManager.setGameActive(false);
        }
        
        // Disable player controls
        if (this.localPlayer) {
            this.localPlayer.setTarget(this.localPlayer.x, this.localPlayer.y);
        }
    }

    createLocalPlayer(playerState) {
        this.localPlayer = new Player(this, playerState.x, playerState.y);
        this.localPlayer.playerId = playerState.id;
        
        // Initialize effects
        this.localPlayer.trailEffect = new TrailEffect(this, this.localPlayer);
        this.localPlayer.skatingTrail = new SkatingTrail(this, this.localPlayer);
        
        // Initialize frozen overlay
        this.localPlayer.frozenOverlay = this.add.image(
            this.localPlayer.x,
            this.localPlayer.y,
            'frozen'
        );
        this.localPlayer.frozenOverlay.setScale(GameConfig.SPRITE_SCALE);
        this.localPlayer.frozenOverlay.setOrigin(0.5, 0.5);
        this.localPlayer.frozenOverlay.setDepth(GameConfig.SPRITE_DEPTH + 0.1);
        this.localPlayer.frozenOverlay.setVisible(false);
        
        // Initialize arrow indicator above player head (local player only)
        this.localPlayer.arrowIndicator = this.add.image(
            this.localPlayer.x,
            this.localPlayer.y - (this.localPlayer.height / 2) - 20,
            'arrow'
        );
        this.localPlayer.arrowIndicator.setOrigin(0.5, 0.5);
        this.localPlayer.arrowIndicator.setDepth(GameConfig.SPRITE_DEPTH + 0.2); // Above player sprite
        this.localPlayer.arrowIndicator.setScale(1.5); // Slightly larger for visibility
        
        // Camera is set up in setupCameraZoom() to show entire world
        // No camera following - entire 1280x720 world is always visible
        
        // NO client-side collisions in multiplayer
        // Server handles ALL collision detection and physics
        // This prevents conflicts and jittering
        
        console.log('[Game] Local player created');
    }

    createRemotePlayer(playerState) {
        // Check if remote player already exists - destroy it first to prevent duplicates
        const existingPlayer = this.remotePlayers.get(playerState.id);
        if (existingPlayer) {
            console.warn('[Game] Remote player already exists, destroying old one:', playerState.id);
            existingPlayer.destroy();
            this.remotePlayers.delete(playerState.id);
        }
        
        const remotePlayer = new RemotePlayer(this, playerState);
        this.remotePlayers.set(playerState.id, remotePlayer);
        
        // Initialize frozen overlay
        remotePlayer.frozenOverlay = this.add.image(
            remotePlayer.x,
            remotePlayer.y,
            'frozen'
        );
        remotePlayer.frozenOverlay.setScale(GameConfig.SPRITE_SCALE);
        remotePlayer.frozenOverlay.setOrigin(0.5, 0.5);
        remotePlayer.frozenOverlay.setDepth(GameConfig.SPRITE_DEPTH + 0.1);
        remotePlayer.frozenOverlay.setVisible(false);
        
        // NO client-side collision handling
        // Server is 100% authoritative for collisions
        // Remote players are just visual representations
        
        console.log('[Game] Remote player created:', playerState.id);
    }

    reconcileLocalPlayer(serverState) {
        if (!this.localPlayer) return;
        
        // Don't reconcile if game has ended
        if (this.gameEnded || this.localPlayer.gameEnded) {
            return;
        }

        // Keep the latest server snapshot for smoothing during the update loop
        this.localPlayer.lastServerState = {
            x: serverState.x,
            y: serverState.y,
            velocityX: serverState.velocityX,
            velocityY: serverState.velocityY,
            isDashing: serverState.isDashing,
            timestamp: serverState.timestamp || this.time.now
        };

        const dx = serverState.x - this.localPlayer.x;
        const dy = serverState.y - this.localPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If the discrepancy is enormous (teleport / collision), snap closer immediately
        if (distance > 180) {
            this.localPlayer.x = Phaser.Math.Linear(this.localPlayer.x, serverState.x, 0.6);
            this.localPlayer.y = Phaser.Math.Linear(this.localPlayer.y, serverState.y, 0.6);
            this.localPlayer.body.velocity.x = serverState.velocityX;
            this.localPlayer.body.velocity.y = serverState.velocityY;
            this.localPlayer.body.acceleration.x = 0;
            this.localPlayer.body.acceleration.y = 0;
        }

        // Sync dash flag so server authority wins
        if (serverState.isDashing !== this.localPlayer.isDashing) {
            this.localPlayer.isDashing = serverState.isDashing;
        }

        // Update target if server reset it (e.g., after knockback)
        if (typeof serverState.targetX === 'number' && typeof serverState.targetY === 'number') {
            const targetDelta =
                Math.abs(this.localPlayer.targetX - serverState.targetX) +
                Math.abs(this.localPlayer.targetY - serverState.targetY);
            if (targetDelta > 1) {
                this.localPlayer.setTarget(serverState.targetX, serverState.targetY);
            }
        }
    }

    applyServerSmoothing(delta) {
        // Don't apply smoothing if game has ended
        if (this.gameEnded) {
            return;
        }
        
        if (!this.localPlayer || !this.localPlayer.lastServerState) {
            return;
        }

        const serverState = this.localPlayer.lastServerState;
        const dx = serverState.x - this.localPlayer.x;
        const dy = serverState.y - this.localPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 1) {
            return;
        }

        const normalizedDelta = Math.min(1.5, delta / (1000 / 60));
        let correctionFactor = 0.04 * normalizedDelta;

        if (distance > 120) {
            correctionFactor = 0.2 * normalizedDelta;
        } else if (distance > 60) {
            correctionFactor = 0.1 * normalizedDelta;
        }

        this.localPlayer.x += dx * correctionFactor;
        this.localPlayer.y += dy * correctionFactor;

        // Blend velocities gently toward server values
        this.localPlayer.body.velocity.x = Phaser.Math.Linear(
            this.localPlayer.body.velocity.x,
            serverState.velocityX,
            0.12 * normalizedDelta
        );
        this.localPlayer.body.velocity.y = Phaser.Math.Linear(
            this.localPlayer.body.velocity.y,
            serverState.velocityY,
            0.12 * normalizedDelta
        );
    }

    // Visually separate overlapping players (client-side only, doesn't affect server physics)
    // This prevents circles from visually overlapping while server handles authoritative physics
    separateOverlappingPlayers() {
        if (!this.localPlayer) return;
        
        // Don't separate if game has ended
        if (this.gameEnded || this.localPlayer.gameEnded) {
            return;
        }
        
        const localRadius = Math.min(this.localPlayer.body.width, this.localPlayer.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        
        for (const remotePlayer of this.remotePlayers.values()) {
            const remoteRadius = Math.min(remotePlayer.body.width, remotePlayer.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
            
            const dx = remotePlayer.x - this.localPlayer.x;
            const dy = remotePlayer.y - this.localPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = localRadius + remoteRadius;
            
            // If overlapping, push apart
            if (distance < minDistance && distance > 0) {
                const overlap = minDistance - distance;
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Push local player away (remote player position comes from server)
                // Use full overlap to ensure complete separation
                this.localPlayer.x -= nx * overlap;
                this.localPlayer.y -= ny * overlap;
                
                // Apply dash recoil for immediate client-side feedback
                // Server will also apply this, so it will sync up
                if (this.localPlayer.isDashing && !this.localPlayer._recoilApplied) {
                    this.localPlayer.body.velocity.x *= GameConfig.DASH_RECOIL;
                    this.localPlayer.body.velocity.y *= GameConfig.DASH_RECOIL;
                    this.localPlayer._recoilApplied = true; // Prevent multiple recoils per dash
                }
            }
        }
    }
    
    // Reset recoil flag when dash ends (called from update)
    resetRecoilFlag() {
        if (this.localPlayer && !this.localPlayer.isDashing) {
            this.localPlayer._recoilApplied = false;
        }
    }
    
    // Trigger screen shake effect for all players when someone falls off
    triggerScreenShake() {
        // Shake duration: 350ms for quick, snappy feel
        // Intensity: 0.01 (1% of screen size) - subtle but noticeable
        // Force: true - camera returns to original position smoothly
        this.cameras.main.shake(350, 0.01, true);
    }
    
    // Check if local player has fallen off the map (single-player only)
    checkLocalPlayerBoundaries() {
        if (!this.localPlayer) return;
        
        const radius = Math.min(this.localPlayer.body.width, this.localPlayer.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        const isOutOfBounds = 
            this.localPlayer.x + radius < 0 ||
            this.localPlayer.x - radius > GameConfig.GAME_WIDTH ||
            this.localPlayer.y + radius < 0 ||
            this.localPlayer.y - radius > GameConfig.GAME_HEIGHT;
        
        if (isOutOfBounds) {
            this.handleLocalPlayerEliminated();
        }
    }
    
    // Check wall collisions (single-player only)
    // Returns immediately after finding the closest collision to ensure only one tile is hit
    checkWallCollisions() {
        if (!this.localPlayer) return;
        
        const playerRadius = Math.min(this.localPlayer.body.width, this.localPlayer.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
        const playerSpeed = Math.sqrt(this.localPlayer.body.velocity.x ** 2 + this.localPlayer.body.velocity.y ** 2);
        const WALL_TILE_SIZE = GameConfig.WALL_TILE_SIZE;
        
        // Store previous position for swept collision (if not already stored)
        if (this.localPlayer.prevX === undefined) {
            this.localPlayer.prevX = this.localPlayer.x;
            this.localPlayer.prevY = this.localPlayer.y;
        }
        
        // Collect all potential collisions first, then find the closest one
        const collisions = [];
        
        // Check all walls in the map (they're already individual tiles now)
        for (const [wallId, wall] of this.walls.entries()) {
            if (!wall || !wall.visible) continue; // Skip destroyed walls
            
            // Get wall position and size from the sprite
            const wallX = wall.x;
            const wallY = wall.y;
            const wallW = WALL_TILE_SIZE;
            const wallH = WALL_TILE_SIZE;
            
            // Use swept collision only for high-speed collisions (dash/high velocity)
            // For low-speed collisions, use simple circle-rectangle collision to avoid weird behavior
            let collisionPoint = null;
            let collisionDistance = Infinity;
            let useSwept = false;
            
            // Only use swept collision if player is moving fast (likely dashing)
            const useSweptCollision = playerSpeed >= GameConfig.WALL_DESTRUCTION_MIN_VELOCITY * 0.7; // 70% of destruction speed
            
            if (useSweptCollision && this.localPlayer.prevX !== undefined && this.localPlayer.prevY !== undefined &&
                (this.localPlayer.x !== this.localPlayer.prevX || this.localPlayer.y !== this.localPlayer.prevY)) {
                const sweptResult = this.checkSweptWallCollision(this.localPlayer, wallX, wallY, wallW, wallH, playerRadius);
                if (sweptResult) {
                    collisionPoint = sweptResult;
                    collisionDistance = sweptResult.distance;
                    useSwept = true;
                }
            }
            
            // Also check current position collision
            const closestX = Math.max(wallX, Math.min(this.localPlayer.x, wallX + wallW));
            const closestY = Math.max(wallY, Math.min(this.localPlayer.y, wallY + wallH));
            
            const dx = this.localPlayer.x - closestX;
            const dy = this.localPlayer.y - closestY;
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
                    wallId: wallId,
                    wall: wall,
                    wallX: wallX,
                    wallY: wallY,
                    distance: finalDistance,
                    useSwept: useSwept && collisionPoint,
                    collisionPoint: collisionPoint,
                    dx: finalDx,
                    dy: finalDy
                });
            }
        }
        
        // If no collisions, update previous position and return
        if (collisions.length === 0) {
            this.localPlayer.prevX = this.localPlayer.x;
            this.localPlayer.prevY = this.localPlayer.y;
            return;
        }
        
        // Sort by distance to find the closest collision (first one hit)
        collisions.sort((a, b) => a.distance - b.distance);
        
        // Handle only the closest collision
        const closest = collisions[0];
        const wallId = closest.wallId;
        const wallX = closest.wallX;
        const wallY = closest.wallY;
        const finalDistance = closest.distance;
        const useSwept = closest.useSwept;
        const collisionPoint = closest.collisionPoint;
        const finalDx = closest.dx;
        const finalDy = closest.dy;
        
        // Calculate wall center
        const wallCenterX = wallX + WALL_TILE_SIZE / 2;
        const wallCenterY = wallY + WALL_TILE_SIZE / 2;
        
        // Calculate direction from wall center to collision point (or player position)
        const collisionX = useSwept ? collisionPoint.x : this.localPlayer.x;
        const collisionY = useSwept ? collisionPoint.y : this.localPlayer.y;
        
        const centerDx = collisionX - wallCenterX;
        const centerDy = collisionY - wallCenterY;
        const centerDistance = Math.sqrt(centerDx * centerDx + centerDy * centerDy);
        
        // Normalize direction (from wall center to collision point)
        const nx = centerDistance > 0.001 ? centerDx / centerDistance : (finalDx / finalDistance || 0);
        const ny = centerDistance > 0.001 ? centerDy / centerDistance : (finalDy / finalDistance || 1);
        
        if (playerSpeed >= GameConfig.WALL_DESTRUCTION_MIN_VELOCITY) {
            // Destroy wall
            this.destroyWall(wallId);
            
            // Stop dash immediately if active
            if (this.localPlayer.isDashing) {
                this.localPlayer.isDashing = false;
                if (this.localPlayer.trailEffect) {
                    this.localPlayer.trailEffect.stop();
                }
            }
            
            // Apply knockback in direction away from wall center
            const knockbackAngle = Math.atan2(ny, nx);
            this.localPlayer.body.setVelocity(
                Math.cos(knockbackAngle) * GameConfig.WALL_DESTRUCTION_KNOCKBACK,
                Math.sin(knockbackAngle) * GameConfig.WALL_DESTRUCTION_KNOCKBACK
            );
            
            // Move player away from wall by a safe distance (playerRadius + buffer)
            // Use larger buffer to ensure player is completely clear of all walls
            const safeDistance = playerRadius + 20; // Increased buffer to prevent hitting adjacent tiles
            this.localPlayer.x = wallCenterX + nx * safeDistance;
            this.localPlayer.y = wallCenterY + ny * safeDistance;
        } else {
            // Not enough velocity - simple wall collision
            // Use simple circle-rectangle collision for low-speed collisions
            // Find the closest point on the wall rectangle to the player
            const closestX = Math.max(wallX, Math.min(this.localPlayer.x, wallX + WALL_TILE_SIZE));
            const closestY = Math.max(wallY, Math.min(this.localPlayer.y, wallY + WALL_TILE_SIZE));
            
            // Calculate normal from closest point (not from center)
            const normalDx = this.localPlayer.x - closestX;
            const normalDy = this.localPlayer.y - closestY;
            const normalLength = Math.sqrt(normalDx * normalDx + normalDy * normalDy);
            
            // If player is exactly on the wall edge, use a default normal
            let normalX, normalY;
            if (normalLength < 0.001) {
                // Player is exactly on edge - determine which edge
                const distToLeft = this.localPlayer.x - wallX;
                const distToRight = (wallX + WALL_TILE_SIZE) - this.localPlayer.x;
                const distToTop = this.localPlayer.y - wallY;
                const distToBottom = (wallY + WALL_TILE_SIZE) - this.localPlayer.y;
                
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
                this.localPlayer.x = closestX + normalX * playerRadius;
                this.localPlayer.y = closestY + normalY * playerRadius;
            }
            
            // Simple velocity reflection along the normal
            const dot = this.localPlayer.body.velocity.x * normalX + this.localPlayer.body.velocity.y * normalY;
            if (dot < 0) { // Only reflect if moving towards wall
                this.localPlayer.body.velocity.x -= 2 * dot * normalX;
                this.localPlayer.body.velocity.y -= 2 * dot * normalY;
            }
            
            // Apply some damping to prevent sliding along walls
            const damping = 0.8;
            this.localPlayer.body.velocity.x *= damping;
            this.localPlayer.body.velocity.y *= damping;
        }
        
        // Update previous position for next frame
        this.localPlayer.prevX = this.localPlayer.x;
        this.localPlayer.prevY = this.localPlayer.y;
    }
    
    // Check swept collision between moving player circle and wall rectangle (client-side)
    checkSweptWallCollision(player, wallX, wallY, wallW, wallH, playerRadius) {
        if (player.prevX === undefined || player.prevY === undefined) return null;
        
        const dx = player.x - player.prevX;
        const dy = player.y - player.prevY;
        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return null; // No movement
        
        // Expand wall rectangle by player radius
        const expandedWall = {
            x: wallX - playerRadius,
            y: wallY - playerRadius,
            width: wallW + playerRadius * 2,
            height: wallH + playerRadius * 2
        };
        
        // Check if movement line intersects expanded wall
        const p0x = player.prevX;
        const p0y = player.prevY;
        const p1x = player.x;
        const p1y = player.y;
        
        let tmin = 0;
        let tmax = 1;
        
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
            const closestX = Math.max(wallX, Math.min(collisionX, wallX + wallW));
            const closestY = Math.max(wallY, Math.min(collisionY, wallY + wallH));
            
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

    update() {
        const delta = this.game.loop.delta || (1000 / 60);
        
        if (this.gameEnded) {
            // Game has ended - gradually stop players but keep collision checks active
            // Gradually reduce velocity for smooth stopping
            if (this.localPlayer) {
                // Ensure player has gameEnded flag set
                this.localPlayer.gameEnded = true;
                
                // Check if player has already stopped (use threshold for floating point precision)
                const minSpeed = 0.5; // Lower threshold for faster stopping
                const speed = Math.sqrt(
                    this.localPlayer.body.velocity.x ** 2 + 
                    this.localPlayer.body.velocity.y ** 2
                );
                const isStopped = speed < minSpeed;
                
                if (!isStopped) {
                    // Store previous position for collision detection
                    this.localPlayer.prevX = this.localPlayer.x;
                    this.localPlayer.prevY = this.localPlayer.y;
                    
                    // Apply very strong damping to quickly reduce velocity to 0
                    const damping = 0.75; // Stronger damping (reduces velocity by 25% each frame)
                    this.localPlayer.body.velocity.x *= damping;
                    this.localPlayer.body.velocity.y *= damping;
                    
                    // Stop if moving very slowly
                    if (Math.abs(this.localPlayer.body.velocity.x) < minSpeed) {
                        this.localPlayer.body.velocity.x = 0;
                    }
                    if (Math.abs(this.localPlayer.body.velocity.y) < minSpeed) {
                        this.localPlayer.body.velocity.y = 0;
                    }
                    
                    // Update position based on velocity (for visual smoothness)
                    const dt = delta / 1000;
                    this.localPlayer.x += this.localPlayer.body.velocity.x * dt;
                    this.localPlayer.y += this.localPlayer.body.velocity.y * dt;
                    
                    // ALWAYS check collisions when moving (in both single-player and multiplayer)
                    // This prevents going through walls or off the map
                    const playerRadius = Math.min(this.localPlayer.body.width, this.localPlayer.body.height) / GameConfig.COLLISION_RADIUS_DIVISOR;
                    
                    // First, enforce boundaries to prevent going off screen (works for both modes)
                    if (this.localPlayer.x - playerRadius < 0) {
                        this.localPlayer.x = playerRadius;
                        this.localPlayer.body.velocity.x = 0;
                    }
                    if (this.localPlayer.x + playerRadius > GameConfig.GAME_WIDTH) {
                        this.localPlayer.x = GameConfig.GAME_WIDTH - playerRadius;
                        this.localPlayer.body.velocity.x = 0;
                    }
                    if (this.localPlayer.y - playerRadius < 0) {
                        this.localPlayer.y = playerRadius;
                        this.localPlayer.body.velocity.y = 0;
                    }
                    if (this.localPlayer.y + playerRadius > GameConfig.GAME_HEIGHT) {
                        this.localPlayer.y = GameConfig.GAME_HEIGHT - playerRadius;
                        this.localPlayer.body.velocity.y = 0;
                    }
                    
                    // Then check wall collisions (single-player only, server handles in multiplayer)
                    if (!this.isMultiplayer) {
                        this.checkWallCollisions();
                    }
                } else {
                    // Player has stopped - COMPLETELY freeze everything
                    this.localPlayer.body.velocity.x = 0;
                    this.localPlayer.body.velocity.y = 0;
                    this.localPlayer.body.acceleration.x = 0;
                    this.localPlayer.body.acceleration.y = 0;
                    // Position is frozen - don't update it at all
                }
                
                // Always reset target and disable any movement
                this.localPlayer.targetX = this.localPlayer.x;
                this.localPlayer.targetY = this.localPlayer.y;
                
                // Disable Phaser physics body movement
                if (this.localPlayer.body) {
                    this.localPlayer.body.setVelocity(0, 0);
                    this.localPlayer.body.setAcceleration(0, 0);
                }
            }
            
            // Gradually reduce velocity for remote players (multiplayer/spectator)
            if (this.isMultiplayer || this.isSpectator) {
                for (const remotePlayer of this.remotePlayers.values()) {
                    // Check if player has already stopped (use threshold for floating point precision)
                    const minSpeed = 1.0;
                    const speed = Math.sqrt(
                        (remotePlayer.body?.velocity?.x || remotePlayer.velocityX || 0) ** 2 + 
                        (remotePlayer.body?.velocity?.y || remotePlayer.velocityY || 0) ** 2
                    );
                    const isStopped = speed < minSpeed;
                    
                    if (!isStopped) {
                        // Apply damping to velocity
                        const damping = 0.85;
                        if (remotePlayer.body && remotePlayer.body.velocity) {
                            remotePlayer.body.velocity.x *= damping;
                            remotePlayer.body.velocity.y *= damping;
                        }
                        if (remotePlayer.velocityX !== undefined) {
                            remotePlayer.velocityX *= damping;
                            remotePlayer.velocityY *= damping;
                        }
                        
                        if (remotePlayer.body && remotePlayer.body.velocity) {
                            if (Math.abs(remotePlayer.body.velocity.x) < minSpeed) {
                                remotePlayer.body.velocity.x = 0;
                            }
                            if (Math.abs(remotePlayer.body.velocity.y) < minSpeed) {
                                remotePlayer.body.velocity.y = 0;
                            }
                        }
                        if (remotePlayer.velocityX !== undefined) {
                            if (Math.abs(remotePlayer.velocityX) < minSpeed) {
                                remotePlayer.velocityX = 0;
                            }
                            if (Math.abs(remotePlayer.velocityY) < minSpeed) {
                                remotePlayer.velocityY = 0;
                            }
                        }
                        
                        // Update position based on velocity
                        const dt = delta / 1000;
                        const velX = remotePlayer.body?.velocity?.x || remotePlayer.velocityX || 0;
                        const velY = remotePlayer.body?.velocity?.y || remotePlayer.velocityY || 0;
                        remotePlayer.x += velX * dt;
                        remotePlayer.y += velY * dt;
                    } else {
                        // Player has stopped - ensure velocity is exactly 0 and freeze position
                        if (remotePlayer.body && remotePlayer.body.velocity) {
                            remotePlayer.body.velocity.x = 0;
                            remotePlayer.body.velocity.y = 0;
                        }
                        if (remotePlayer.velocityX !== undefined) {
                            remotePlayer.velocityX = 0;
                            remotePlayer.velocityY = 0;
                        }
                        // Position is already frozen (don't update)
                    }
                }
                
                // Update snowballs (they should also stop)
                for (const snowball of this.snowballs.values()) {
                    snowball.update(delta);
                }
            }
            
            // Update dummy in single-player mode
            if (this.dummy) {
                // Check if dummy has already stopped
                const isStopped = this.dummy.body.velocity.x === 0 && this.dummy.body.velocity.y === 0;
                
                if (!isStopped) {
                    // Apply damping to dummy velocity
                    const damping = 0.85;
                    this.dummy.body.velocity.x *= damping;
                    this.dummy.body.velocity.y *= damping;
                    
                    const minSpeed = 1.0;
                    if (Math.abs(this.dummy.body.velocity.x) < minSpeed) {
                        this.dummy.body.velocity.x = 0;
                    }
                    if (Math.abs(this.dummy.body.velocity.y) < minSpeed) {
                        this.dummy.body.velocity.y = 0;
                    }
                    
                    const dt = delta / 1000;
                    this.dummy.x += this.dummy.body.velocity.x * dt;
                    this.dummy.y += this.dummy.body.velocity.y * dt;
                }
                // If stopped, keep position frozen (don't update)
            }
        } else {
            // Normal game updates
        // Check for dash input
        if (this.localPlayer && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            // Frozen players cannot dash
            if (this.localPlayer.isFrozen) {
                return;
            }
            
            if (this.isMultiplayer && this.network) {
                // Send dash to server
                if (this.network.sendDash) {
                    this.network.sendDash();
                }
                
                // Also dash locally for immediate feedback (client prediction)
                this.localPlayer.dash();
            } else if (!this.isMultiplayer) {
                // Single-player: dash locally only
                this.localPlayer.dash();
            }
        }
        
        // Update local player
        if (this.localPlayer) {
            this.localPlayer.update();
            
            // Check for falling off in single-player mode
            if (!this.isMultiplayer) {
                this.checkLocalPlayerBoundaries();
                this.checkWallCollisions();
            }
            
            // Apply server smoothing in multiplayer mode
            if (this.isMultiplayer) {
                this.applyServerSmoothing(delta);
            }
        }
        
        // Update dummy in single-player mode
        if (this.dummy) {
            this.dummy.update();
        }
        
        // Update remote players in multiplayer mode OR spectator mode
        if (this.isMultiplayer || this.isSpectator) {
            for (const remotePlayer of this.remotePlayers.values()) {
                remotePlayer.update(delta);
            }
            
            // Update snowballs
            for (const snowball of this.snowballs.values()) {
                snowball.update(delta);
            }
            
            // Visually separate overlapping players AFTER all positions are updated
            // This ensures collision circles don't visually overlap
            if (this.isMultiplayer) {
                this.separateOverlappingPlayers();
                
                // Reset recoil flag when dash ends
                this.resetRecoilFlag();
                }
            }
        }
        
        // Always update animations (even when game has ended)
        // Update all active explosions
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const explosion = this.explosions[i];
            explosion.update();
            
            // Remove completed explosions
            if (explosion.isDestroyed) {
                this.explosions.splice(i, 1);
            }
        }
        
        // Update all active snowball impacts
        for (let i = this.snowballImpacts.length - 1; i >= 0; i--) {
            const impact = this.snowballImpacts[i];
            impact.update();
            
            // Remove completed impacts
            if (impact.isDestroyed) {
                this.snowballImpacts.splice(i, 1);
            }
        }
        
        // Update all active frozen destroyed effects
        for (let i = this.frozenDestroyedEffects.length - 1; i >= 0; i--) {
            const effect = this.frozenDestroyedEffects[i];
            effect.update();
            
            // Remove completed effects
            if (effect.isDestroyed) {
                this.frozenDestroyedEffects.splice(i, 1);
            }
        }
        
        // Update snowfall effect
        if (this.snowflakes) {
            const deltaSeconds = delta / 1000; // Convert to seconds
            const BLIZZARD_WIND_SPEED = -60; // Leftward wind speed (pixels per second)
            
            for (const snowflake of this.snowflakes) {
                const data = snowflake.snowfallData;
                
                // Move snowflake down
                snowflake.y += data.fallSpeed * deltaSeconds;
                
                // Apply blizzard wind (consistent leftward movement)
                snowflake.x += BLIZZARD_WIND_SPEED * deltaSeconds;
                
                // Apply horizontal drift variation (sine wave for smooth swaying)
                const time = this.time.now / 1000; // Current time in seconds
                const swayAmount = Math.sin(time * 0.5 + snowflake.x * 0.01) * data.driftSpeed * deltaSeconds;
                snowflake.x += swayAmount;
                
                // Wrap around horizontally if it goes off screen (moving left, so wrap to right side)
                if (snowflake.x < -50) {
                    snowflake.x = GameConfig.GAME_WIDTH + 50; // Wrap to right side
                }
                
                // Reset to top when it reaches the bottom
                if (snowflake.y > GameConfig.GAME_HEIGHT + 50) {
                    snowflake.y = -50; // Start above screen
                    // Spawn across full width (including slightly beyond right edge for leftward movement)
                    snowflake.x = Phaser.Math.Between(-50, GameConfig.GAME_WIDTH + 50);
                }
            }
        }
        
        // Update game timer display
        if (window.clientRoundManager) {
            window.clientRoundManager.updateGameTimer();
        }
    }
    
    showClickEffect(x, y) {
        // Create a sprite for the click effect
        const clickSprite = this.add.sprite(x, y, 'click');
        clickSprite.setDepth(GameConfig.SPRITE_DEPTH + 10); // Above other sprites
        clickSprite.setOrigin(0.5, 0.5); // Center origin
        
        // Play the animation
        clickSprite.play('click');
        
        // Destroy the sprite when animation completes
        clickSprite.on('animationcomplete', () => {
            clickSprite.destroy();
        });
    }
}
