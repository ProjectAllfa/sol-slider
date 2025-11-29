// Client-side network manager
// Handles connection to server and message passing

class NetworkManager {
    constructor(scene) {
        this.scene = scene;
        this.socket = null;
        this.localPlayerId = null;
        this.isConnected = false;
        this.lastServerUpdate = 0;
        
        // Callbacks
        this.onGameInit = null;
        this.onGameUpdate = null;
        this.onPlayerJoined = null;
        this.onPlayerLeft = null;
        this.onPlayerEliminated = null;
        this.onWallDestroyed = null;
        this.onWallsReset = null;
        this.onSnowballImpact = null;
        this.onFrozenDestroyed = null;
    }

    connect() {
        console.log('[Network] Connecting to server...');
        
        // Connect to Socket.io server
        this.socket = io();
        
        // Connection established
        this.socket.on('connect', () => {
            this.isConnected = true;
            console.log('[Network] Connected to server');
            
            // Notify chat manager that socket is ready
            window.dispatchEvent(new CustomEvent('socketReady', { 
                detail: { socket: this.socket } 
            }));
        });
        
        // Receive initial game state
        this.socket.on('game:init', (data) => {
            console.log('[Network] Received game init', data);
            this.localPlayerId = data.playerId;
            
            // If we have a playerId, we're actually playing (not just queued)
            if (data.playerId && !data.isSpectator) {
                // Hide join button - we're now in the game
                if (window.userFormManager) {
                    window.userFormManager.hideJoinButton();
                }
            }
            
            if (this.onGameInit) {
                this.onGameInit(data);
            }
        });
        
        // Player queued confirmation
        this.socket.on('player:queued', (data) => {
            console.log('[Network] Player queued:', data.message);
            // Button already shows "Joined" from userForm.js
        });
        
        // Receive game state updates
        this.socket.on('game:update', (gameState) => {
            this.lastServerUpdate = Date.now();
            
            if (this.onGameUpdate) {
                this.onGameUpdate(gameState);
            }
        });
        
        // Player joined
        this.socket.on('player:joined', (playerState) => {
            console.log('[Network] Player joined:', playerState.id);
            
            if (this.onPlayerJoined) {
                this.onPlayerJoined(playerState);
            }
        });
        
        // Player left
        this.socket.on('player:left', (data) => {
            console.log('[Network] Player left:', data.playerId);
            
            if (this.onPlayerLeft) {
                this.onPlayerLeft(data.playerId);
            }
        });
        
        // Player eliminated (fell off map)
        this.socket.on('player:eliminated', (data) => {
            console.log('[Network] Player eliminated:', data.playerId);
            
            if (this.onPlayerEliminated) {
                this.onPlayerEliminated(data.playerId);
            }
        });
        
        // Wall destroyed
        this.socket.on('wall:destroyed', (data) => {
            console.log('[Network] Wall destroyed:', data.wallId);
            
            if (this.onWallDestroyed) {
                this.onWallDestroyed(data.wallId);
            }
        });
        
        // Walls reset (all walls restored for new round)
        this.socket.on('walls:reset', () => {
            console.log('[Network] Walls reset for new round');
            
            if (this.onWallsReset) {
                this.onWallsReset();
            }
        });
        
        // Snowball impact
        this.socket.on('snowball:impact', (data) => {
            if (this.onSnowballImpact) {
                this.onSnowballImpact(data.x, data.y);
            }
        });
        
        // Frozen destroyed
        this.socket.on('frozen:destroyed', (data) => {
            if (this.onFrozenDestroyed) {
                this.onFrozenDestroyed(data.playerId, data.x, data.y);
            }
        });
        
        // Dash success confirmation
        this.socket.on('player:dash:success', () => {
            // Server confirmed dash, no action needed (visual feedback already shown)
        });
        
        // Snowball throw success confirmation
        this.socket.on('player:snowball:success', () => {
            // Server confirmed snowball throw, no action needed (visual feedback already shown)
        });
        
        // Disconnection
        this.socket.on('disconnect', () => {
            this.isConnected = false;
            console.log('[Network] Disconnected from server');
        });
        
        // Round/Queue events
        this.socket.on('queue:update', (state) => {
            if (window.clientRoundManager) {
                window.clientRoundManager.updateQueue(state);
            }
        });
        
        this.socket.on('game:start', (data) => {
            if (window.clientRoundManager) {
                window.clientRoundManager.handleGameStart(data);
            }
        });
        
        this.socket.on('round:game:update', (state) => {
            // Round game timer updates
            if (window.clientRoundManager) {
                window.clientRoundManager.updateGame(state);
            }
        });
        
        this.socket.on('game:end', (data) => {
            if (window.clientRoundManager) {
                window.clientRoundManager.handleGameEnd(data);
            }
            
            // Notify game scene to remove all players
            if (this.onGameEnd) {
                this.onGameEnd(data);
            }
        });
        
        this.socket.on('round:state', (state) => {
            if (window.clientRoundManager) {
                window.clientRoundManager.handleRoundState(state);
            }
        });
    }

    // Send movement input to server
    sendMove(x, y) {
        if (!this.isConnected) return;
        
        this.socket.emit('player:move', {
            x: x,
            y: y,
            timestamp: Date.now()
        });
    }

    // Send dash input to server
    sendDash() {
        if (!this.isConnected) return;
        
        this.socket.emit('player:dash', {
            timestamp: Date.now()
        });
    }
    
    // Send snowball throw input to server
    sendThrowSnowball(targetX, targetY) {
        if (!this.isConnected) return;
        
        this.socket.emit('player:throwSnowball', {
            targetX: targetX,
            targetY: targetY,
            timestamp: Date.now()
        });
    }

    isLocalPlayer(playerId) {
        return playerId === this.localPlayerId;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.isConnected = false;
        }
    }
}

