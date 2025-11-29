// Initialize game immediately (spectator mode)
function initGame() {
    // Professional casino game approach: Lock aspect ratio to 1280x720
    // Use letterboxing/pillarboxing when viewport doesn't match
    // This ensures identical visuals and gameplay on all devices
    const config = {
        type: Phaser.AUTO,
        width: GameConfig.GAME_WIDTH,  // Fixed 1280
        height: GameConfig.GAME_HEIGHT, // Fixed 720
        parent: 'game-container',
        backgroundColor: '#1a1a1a', // Black background for letterboxing
        scale: {
            mode: Phaser.Scale.FIT, // Always shows full game, letterboxes when needed
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: GameConfig.GAME_WIDTH,
            height: GameConfig.GAME_HEIGHT
        },
    render: {
        pixelArt: true, // Enable pixel-perfect rendering for crisp sprites
        antialias: false // Disable antialiasing for pixel art
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
        scene: GameScene // Unified scene (supports both single-player and multiplayer)
    };

    const game = new Phaser.Game(config);

    // FIT mode ensures the entire 1280x720 game is ALWAYS visible on all screen sizes
    // Letterboxing/pillarboxing appears when viewport aspect ratio doesn't match 16:9
    // This guarantees all players see the full game screen regardless of their device
}

// Listen for join game event
window.addEventListener('joinGame', (event) => {
    console.log('[Game] Join game requested:', event.detail);
    // Store user data globally for potential use in the game
    window.userData = event.detail;
    
    // Trigger game to connect to multiplayer
    // The game scene will handle the connection
    if (window.gameScene && window.gameScene.initMultiplayer) {
        window.gameScene.initMultiplayer();
    }
});

// Initialize game immediately (starts in spectator mode)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

