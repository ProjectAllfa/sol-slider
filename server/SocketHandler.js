// Socket.io handler for client connections and messages

const ServerPlayer = require('./entities/ServerPlayer');
const GameConfig = require('./config/GameConfig');

class SocketHandler {
    constructor(io, gameLoop, roundManager = null) {
        this.io = io;
        this.gameLoop = gameLoop;
        this.roundManager = roundManager;
        
        // Chat message history (store last 100 messages)
        this.chatHistory = [];
        this.maxChatHistory = 100;
        
        this.setupSocketHandlers();
        
        // Set up elimination callback
        this.gameLoop.onPlayerEliminated = (playerId) => {
            this.handlePlayerElimination(playerId);
        };
        
        // Set up wall destruction callback
        this.gameLoop.onWallDestroyed = (wallId) => {
            this.handleWallDestroyed(wallId);
        };
        
        // Set up snowball impact callback
        this.gameLoop.onSnowballImpact = (x, y) => {
            this.handleSnowballImpact(x, y);
        };
        
        // Set up frozen destroyed callback
        this.gameLoop.onFrozenDestroyed = (playerId, x, y) => {
            this.handleFrozenDestroyed(playerId, x, y);
        };
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`[Socket] Client connected: ${socket.id}`);
            
            // By default, connect as spectator to view the game
            this.handleSpectatorConnect(socket);
            
            // Handle player join request (when user clicks "Join Game")
            socket.on('player:join', (data) => {
                this.handlePlayerJoin(socket, data);
            });
            
            // Handle player input
            socket.on('player:move', (data) => this.handlePlayerMove(socket, data));
            socket.on('player:dash', (data) => this.handlePlayerDash(socket, data));
            socket.on('player:throwSnowball', (data) => this.handlePlayerThrowSnowball(socket, data));
            
            // Chat message handler
            socket.on('chat:message', (data) => this.handleChatMessage(socket, data));
            
            // Handle disconnect
            socket.on('disconnect', () => this.handlePlayerLeave(socket));
        });
    }

    handleSpectatorConnect(socket) {
        console.log(`[Socket] Spectator connected: ${socket.id}`);
        
        // Send current game state to spectator (without creating a player)
        const gameState = this.gameLoop.getGameState();
        socket.emit('game:init', {
            playerId: null, // No player ID for spectators
            gameState: gameState,
            isSpectator: true
        });
        
        // Send current round state
        if (this.roundManager) {
            socket.emit('round:state', this.roundManager.getState());
        }
        
        // Send chat history to new client
        if (this.chatHistory.length > 0) {
            socket.emit('chat:history', this.chatHistory);
        }
    }

    handlePlayerJoin(socket, data = {}) {
        // Get user data from event data or socket query
        const username = data.username || socket.handshake.query?.username || 'Player';
        const publicWallet = data.publicWallet || socket.handshake.query?.publicWallet || '';
        
        // Add player to queue instead of spawning immediately
        if (this.roundManager) {
            // Check if already in queue
            if (this.roundManager.queuedPlayers.has(socket.id)) {
                console.log(`[Socket] Player ${socket.id} already in queue`);
                socket.emit('player:queued', { 
                    message: 'Already in queue',
                    queuedPlayerCount: this.roundManager.queuedPlayers.size
                });
                return;
            }
            
            // Add to queue (async but don't wait)
            this.roundManager.addPlayerToQueue(socket, username, publicWallet).catch(err => {
                console.warn(`[Socket] Error adding player to queue: ${err.message}`);
            });
            
            // Send confirmation
            socket.emit('player:queued', { 
                message: 'Added to queue for next round',
                queuedPlayerCount: this.roundManager.queuedPlayers.size
            });
            
            // Send current round state
            socket.emit('round:state', this.roundManager.getState());
            
            // Broadcast updated queue count to all clients
            this.io.emit('queue:update', {
                isInQueue: this.roundManager.isInQueue,
                timeRemaining: this.roundManager.queueTimeRemaining,
                playerCount: this.roundManager.getPlayerCount()
            });
            
            console.log(`[Socket] Player ${socket.id} added to queue (${this.roundManager.queuedPlayers.size} total)`);
        } else {
            // No round manager, spawn immediately (fallback)
            this.spawnPlayer(socket);
        }
    }

    spawnPlayer(socket) {
        // Create new player at random spawn position
        const spawnX = GameConfig.GAME_WIDTH / 2 + (Math.random() - 0.5) * 200;
        const spawnY = GameConfig.GAME_HEIGHT / 2 + (Math.random() - 0.5) * 200;
        
        const player = new ServerPlayer(socket.id, spawnX, spawnY);
        this.gameLoop.addPlayer(player);
        
        // Send current game state to the new player (including wall state)
        const gameState = this.gameLoop.getGameState();
        socket.emit('game:init', {
            playerId: socket.id,
            gameState: gameState
        });
        
        // Send current round state
        if (this.roundManager) {
            socket.emit('round:state', this.roundManager.getState());
        }
        
        // Send chat history to new client
        if (this.chatHistory && this.chatHistory.length > 0) {
            socket.emit('chat:history', this.chatHistory);
        }
        
        // Notify all other players about new player
        socket.broadcast.emit('player:joined', player.getState());
        
        console.log(`[Socket] Player spawned: ${socket.id} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
    }

    spawnQueuedPlayers(queuedPlayerIds) {
        // Spawn all queued players at once
        for (const playerId of queuedPlayerIds) {
            const queuedPlayer = this.roundManager.queuedPlayers.get(playerId);
            if (queuedPlayer) {
                this.spawnPlayer(queuedPlayer.socket);
                // Remove from queue after spawning
                this.roundManager.removePlayerFromQueue(playerId);
            }
        }
    }

    handlePlayerMove(socket, data) {
        const player = this.gameLoop.getPlayer(socket.id);
        if (!player) return;
        
        // Validate input
        if (typeof data.x !== 'number' || typeof data.y !== 'number') return;
        
        // Apply movement input
        player.setTarget(data.x, data.y);
    }

    handlePlayerDash(socket, data) {
        const player = this.gameLoop.getPlayer(socket.id);
        if (!player) return;
        
        // Attempt dash
        const success = player.dash(Date.now());
        
        // Notify client if dash was successful (for local feedback)
        if (success) {
            socket.emit('player:dash:success');
        }
    }
    
    handlePlayerThrowSnowball(socket, data) {
        const player = this.gameLoop.getPlayer(socket.id);
        if (!player) return;
        
        // Validate input
        if (typeof data.targetX !== 'number' || typeof data.targetY !== 'number') return;
        
        // Check if player can throw
        if (!player.canThrowSnowball()) {
            return; // Silently fail if on cooldown or frozen
        }
        
        // Start cooldown
        player.throwSnowball();
        
        // Create snowball
        const snowball = this.gameLoop.throwSnowball(
            socket.id,
            player.x,
            player.y,
            data.targetX,
            data.targetY
        );
        
        if (snowball) {
            // Notify client of success
            socket.emit('player:snowball:success');
        }
    }

    handlePlayerLeave(socket) {
        const playerId = socket.id;
        
        // Remove from game if playing
        if (this.gameLoop.getPlayer(playerId)) {
            this.gameLoop.removePlayer(playerId);
        }
        
        // Remove from queue if queued
        if (this.roundManager) {
            this.roundManager.removePlayerFromQueue(playerId);
        }
        
        // Notify all other players
        this.io.emit('player:left', { playerId: playerId });
        
        console.log(`[Socket] Player left: ${playerId}`);
    }
    
    handlePlayerElimination(playerId) {
        // Remove player from game loop
        this.gameLoop.removePlayer(playerId);
        
        // Notify the eliminated player
        const socket = this.io.sockets.sockets.get(playerId);
        if (socket) {
            socket.emit('player:eliminated', { playerId: playerId });
        }
        
        // Notify all other players
        this.io.emit('player:eliminated', { playerId: playerId });
        
        console.log(`[Socket] Player eliminated (fell off map): ${playerId}`);
    }
    
    handleWallDestroyed(wallId) {
        // Broadcast wall destruction to all clients
        this.io.emit('wall:destroyed', { wallId: wallId });
        console.log(`[Socket] Wall destroyed: ${wallId}`);
    }
    
    handleSnowballImpact(x, y) {
        // Broadcast snowball impact to all clients
        this.io.emit('snowball:impact', { x: x, y: y });
    }
    
    handleFrozenDestroyed(playerId, x, y) {
        // Broadcast frozen destroyed to all clients
        this.io.emit('frozen:destroyed', { playerId: playerId, x: x, y: y });
    }

    // Broadcast game state to all clients
    broadcastGameState() {
        // Don't broadcast if game has ended (players are frozen)
        if (this.gameLoop.gameEnded) {
            return;
        }
        const gameState = this.gameLoop.getGameState();
        this.io.emit('game:update', gameState);
    }

    // Handle chat messages from clients
    handleChatMessage(socket, data) {
        // Validate message
        if (!data || !data.message || typeof data.message !== 'string') {
            return;
        }

        const message = data.message.trim();
        if (message.length === 0 || message.length > 200) {
            return; // Invalid message length
        }

        const username = data.username || 'Anonymous';
        const timestamp = Date.now();

        // Create chat message object
        const chatMessage = {
            username: username,
            message: message,
            timestamp: timestamp
        };

        // Add to chat history
        this.chatHistory.push(chatMessage);
        
        // Keep only last maxChatHistory messages
        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift(); // Remove oldest message
        }

        // Broadcast message to all clients (including spectators)
        this.io.emit('chat:message', chatMessage);

        console.log(`[Chat] ${username}: ${message}`);
    }

    // Send system message to all clients
    sendSystemMessage(message) {
        const timestamp = Date.now();
        
        // Create system message object
        const systemMessage = {
            username: 'system',
            message: message,
            timestamp: timestamp,
            isSystem: true
        };

        // Add to chat history
        this.chatHistory.push(systemMessage);
        
        // Keep only last maxChatHistory messages
        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift(); // Remove oldest message
        }

        // Broadcast system message to all clients
        this.io.emit('chat:message', systemMessage);

        console.log(`[Chat] system: ${message}`);
    }
}

module.exports = SocketHandler;

