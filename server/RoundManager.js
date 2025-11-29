// Round Manager - handles queue and game rounds
const { claimAndTransferFees, calculatePotAndBuyTokens } = require('./utils/pumpportal');
const { distributeTokensToWinners, formatTokenAmount, getTokenDecimals } = require('./utils/tokenOperations');
const AdminConfig = require('../models/adminConfig');
const TokenStats = require('../models/tokenStats');
const PlayerStats = require('../models/playerStats');
const User = require('../models/user');
const { Connection, PublicKey } = require('@solana/web3.js');
const { decrypt } = require('./utils/encryption');

class RoundManager {
    constructor(gameLoop, socketHandler = null) {
        this.gameLoop = gameLoop;
        this.socketHandler = socketHandler; // Reference to socket handler for getting player data
        this.isInQueue = true;
        this.isInGame = false;
        this.currentRound = 0;
        this.queueTimeRemaining = 0;
        this.gameTimeRemaining = 0;
        this.queueTimer = null;
        this.gameTimer = null;
        this.minPlayersRequired = 2;
        this.queueDuration = 60000; // 1 minute in milliseconds
        this.gameDuration = 180000; // 3 minutes in milliseconds
        this.queueUpdateInterval = null;
        this.gameUpdateInterval = null;
        
        // Queue of players waiting to join next round
        this.queuedPlayers = new Map(); // playerId -> { socket, username, publicWallet, joinedAt }
        
        // Store player wallet info when they join (for winners)
        this.playerWallets = new Map(); // playerId -> { username, publicWallet, clientId }
        
        // Store all players who participated in current game (for stats tracking)
        this.gameParticipants = new Set(); // Set of playerIds who were in this game
        
        // Current round pot and token info
        this.currentPotAmount = 0; // in lamports
        this.currentPotAmountSol = 0; // in SOL
        this.currentTokenAmount = 0; // tokens to distribute (raw amount)
        this.currentFormattedTokenAmount = 0; // tokens to distribute (formatted for display)
        this.currentTokenAccount = null; // token account address
        this.currentTokenMint = null; // token mint address
        
        // Track which round we've processed fees for (to avoid reprocessing on queue extensions)
        this.feesProcessedForRound = 0;
        
        // Callbacks
        this.onQueueUpdate = null;
        this.onGameStart = null;
        this.onGameUpdate = null;
        this.onGameEnd = null;
        this.onRoundEnd = null;
    }

    start() {
        console.log('[RoundManager] Starting round manager');
        this.startQueue();
    }

    stop() {
        console.log('[RoundManager] Stopping round manager');
        this.clearTimers();
    }

    resetForNewToken() {
        console.log('[RoundManager] Resetting for new token - clearing all round state');
        // Reset round counter
        this.currentRound = 0;
        // Reset fees processed flag so fees will be claimed for new token
        this.feesProcessedForRound = 0;
        // Clear pot and token info (including any leftover tokens)
        this.currentPotAmount = 0;
        this.currentPotAmountSol = 0;
        this.currentTokenAmount = 0;
        this.currentFormattedTokenAmount = 0;
        this.currentTokenAccount = null;
        this.currentTokenMint = null;
        // Clear queued players
        this.queuedPlayers.clear();
        // Clear game participants
        this.gameParticipants.clear();
        // Clear player wallets
        this.playerWallets.clear();
        // Reset game state
        this.isInQueue = false;
        this.isInGame = false;
        this.queueTimeRemaining = 0;
        this.gameTimeRemaining = 0;
        // Clear any timers
        this.clearTimers();
        console.log('[RoundManager] Reset complete - ready for new token');
    }

    clearTimers() {
        if (this.queueTimer) {
            clearTimeout(this.queueTimer);
            this.queueTimer = null;
        }
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.queueUpdateInterval) {
            clearInterval(this.queueUpdateInterval);
            this.queueUpdateInterval = null;
        }
        if (this.gameUpdateInterval) {
            clearInterval(this.gameUpdateInterval);
            this.gameUpdateInterval = null;
        }
    }

    getPlayerCount() {
        // Return count of players in game + queued players
        return this.gameLoop.players.size + this.queuedPlayers.size;
    }

    async addPlayerToQueue(socket, username, publicWallet) {
        const playerId = socket.id;
        if (!this.queuedPlayers.has(playerId)) {
            // Try to get clientId from User model if publicWallet is provided
            let clientId = null;
            if (publicWallet && publicWallet.trim() !== '') {
                try {
                    const user = await User.findOne({ publicWallet: publicWallet.trim() });
                    if (user) {
                        clientId = user.clientId;
                    }
                } catch (error) {
                    console.warn(`[RoundManager] Could not look up clientId for wallet ${publicWallet}: ${error.message}`);
                }
            }
            
            this.queuedPlayers.set(playerId, {
                socket: socket,
                username: username || 'Player',
                publicWallet: publicWallet || '',
                clientId: clientId,
                joinedAt: new Date()
            });
            // Also store wallet info for winner distribution
            this.playerWallets.set(playerId, {
                username: username || 'Player',
                publicWallet: publicWallet || '',
                clientId: clientId
            });
            console.log(`[RoundManager] Player ${playerId} added to queue (${this.queuedPlayers.size} in queue)`);
            return true;
        }
        return false;
    }

    removePlayerFromQueue(playerId) {
        if (this.queuedPlayers.has(playerId)) {
            this.queuedPlayers.delete(playerId);
            console.log(`[RoundManager] Player ${playerId} removed from queue`);
            return true;
        }
        return false;
    }

    spawnQueuedPlayers() {
        // Spawn all queued players at once when round starts
        const spawnedCount = 0;
        for (const [playerId, playerData] of this.queuedPlayers.entries()) {
            // Player will be spawned by SocketHandler when round starts
            // We just need to notify that they should be spawned
            console.log(`[RoundManager] Queued player ${playerId} ready to spawn`);
        }
        return this.queuedPlayers.size;
    }

    async startQueue(isExtension = false) {
        // Check if game is paused
        const adminConfig = await AdminConfig.findOne();
        if (adminConfig && adminConfig.gamePaused) {
            console.log('[RoundManager] ⏸️  Game is paused - not starting new queue');
            return;
        }
        
        const nextRound = this.currentRound + 1;
        
        if (isExtension) {
            console.log('[RoundManager] ===== Extending queue countdown =====');
            console.log(`[RoundManager] Round ${nextRound} - Extending queue countdown (keeping existing pot/tokens)`);
        } else {
            console.log('[RoundManager] ===== Starting new round queue =====');
            console.log(`[RoundManager] Round ${nextRound} - Queue countdown starting in 1 minute`);
        }
        
        // Only claim creator fees and buy tokens if we haven't processed fees for this round yet
        // When extending the queue, we keep the existing pot/token info
        if (!isExtension && this.feesProcessedForRound !== nextRound) {
            // Claim creator fees and transfer to pot wallet BEFORE starting countdown
            // This runs asynchronously and doesn't block the queue from starting
            this.claimCreatorFees();
            this.feesProcessedForRound = nextRound; // Mark that we've processed fees for this round
        } else if (isExtension) {
            console.log(`[RoundManager] ℹ️  Skipping fee claim/buy process - already processed for round ${nextRound}`);
        }
        
        this.isInQueue = true;
        this.isInGame = false;
        this.queueTimeRemaining = this.queueDuration;
        
        // Clear any existing timers
        this.clearTimers();
        
        // Start queue countdown
        this.queueTimer = setTimeout(() => {
            this.checkQueueEnd();
        }, this.queueDuration);
        
        // Update queue time every second
        this.queueUpdateInterval = setInterval(async () => {
            this.queueTimeRemaining -= 1000;
            if (this.queueTimeRemaining < 0) {
                this.queueTimeRemaining = 0;
            }
            
            if (this.onQueueUpdate) {
                const adminConfig = await AdminConfig.findOne();
                this.onQueueUpdate({
                    timeRemaining: this.queueTimeRemaining,
                    playerCount: this.getPlayerCount(),
                    isInQueue: true,
                    potAmount: this.currentPotAmountSol,
                    tokenAmount: this.currentFormattedTokenAmount || 0,
                    tokenTicker: adminConfig?.tokenTicker || '$SLIDE'
                });
            }
        }, 1000);
        
        // Initial update
        (async () => {
            if (this.onQueueUpdate) {
                const adminConfig = await AdminConfig.findOne();
                this.onQueueUpdate({
                    timeRemaining: this.queueTimeRemaining,
                    playerCount: this.getPlayerCount(),
                    isInQueue: true,
                    potAmount: this.currentPotAmountSol,
                    tokenAmount: this.currentFormattedTokenAmount || 0,
                    tokenTicker: adminConfig?.tokenTicker || '$SLIDE'
                });
            }
        })();
    }

    async checkQueueEnd() {
        // Check if game is paused
        const adminConfig = await AdminConfig.findOne();
        if (adminConfig && adminConfig.gamePaused) {
            console.log('[RoundManager] ⏸️  Game is paused - not starting game or extending queue');
            return;
        }
        
        // Count only queued players (not active game players)
        const queuedCount = this.queuedPlayers.size;
        
        if (queuedCount >= this.minPlayersRequired) {
            // Enough players, start game and spawn all queued players
            this.startGame();
        } else {
            // Not enough players, extend queue (don't reprocess fees/tokens)
            console.log(`[RoundManager] Not enough players (${queuedCount}/${this.minPlayersRequired}), extending queue`);
            this.startQueue(true); // Restart queue as extension (keep existing pot/tokens)
        }
    }

    startGame() {
        console.log('[RoundManager] Starting game round');
        this.isInQueue = false;
        this.isInGame = true;
        this.currentRound++;
        this.gameTimeRemaining = this.gameDuration;
        
        // Clear queue timers
        if (this.queueTimer) {
            clearTimeout(this.queueTimer);
            this.queueTimer = null;
        }
        if (this.queueUpdateInterval) {
            clearInterval(this.queueUpdateInterval);
            this.queueUpdateInterval = null;
        }
        
        // Spawn all queued players now
        const queuedPlayerIds = Array.from(this.queuedPlayers.keys());
        console.log(`[RoundManager] Spawning ${queuedPlayerIds.length} queued players`);
        
        // Track all players who are participating in this game
        this.gameParticipants = new Set(queuedPlayerIds);
        
        // Start game timer
        this.gameTimer = setTimeout(() => {
            this.endGame();
        }, this.gameDuration);
        
        // Update game time every second
        this.gameUpdateInterval = setInterval(() => {
            this.gameTimeRemaining -= 1000;
            if (this.gameTimeRemaining < 0) {
                this.gameTimeRemaining = 0;
            }
            
            // Check if timer reached 0
            if (this.gameTimeRemaining <= 0) {
                console.log('[RoundManager] Round ending - time expired');
                this.endGame();
                return;
            }
            
            // Check if all players eliminated
            const alivePlayers = this.getAlivePlayerCount();
            if (alivePlayers <= 1) {
                // If 1 or 0 players left, end game
                console.log(`[RoundManager] Round ending - only ${alivePlayers} player(s) remaining`);
                this.endGame();
                return;
            }
            
            if (this.onGameUpdate) {
                this.onGameUpdate({
                    timeRemaining: this.gameTimeRemaining,
                    playerCount: this.getPlayerCount(),
                    aliveCount: alivePlayers,
                    isInGame: true
                });
            }
        }, 1000);
        
        // Notify game start with queued player IDs
        if (this.onGameStart) {
            this.onGameStart({
                round: this.currentRound,
                duration: this.gameDuration,
                queuedPlayerIds: queuedPlayerIds
            });
        }
        
        // Initial update
        if (this.onGameUpdate) {
            this.onGameUpdate({
                timeRemaining: this.gameTimeRemaining,
                playerCount: this.getPlayerCount(),
                aliveCount: this.getAlivePlayerCount(),
                isInGame: true
            });
        }
    }

    getAlivePlayerCount() {
        // Count players that haven't been eliminated
        // Players are removed from gameLoop when eliminated, so this should work
        return this.gameLoop.players.size;
    }

    async endGame() {
        console.log('[RoundManager] Ending game round - freezing for 5 seconds');
        this.isInGame = false;
        
        // Clear game timers
        if (this.gameTimer) {
            clearTimeout(this.gameTimer);
            this.gameTimer = null;
        }
        if (this.gameUpdateInterval) {
            clearInterval(this.gameUpdateInterval);
            this.gameUpdateInterval = null;
        }
        
        // Get winners (all remaining players) before removing them
        const winnerIds = Array.from(this.gameLoop.players.keys());
        
        // Get winner data with wallet addresses from stored player wallets
        const winners = [];
        for (const playerId of winnerIds) {
            const playerData = this.playerWallets.get(playerId);
            if (playerData && playerData.publicWallet) {
                winners.push({
                    playerId: playerId,
                    publicWallet: playerData.publicWallet,
                    username: playerData.username || 'Player'
                });
            } else {
                // Try to get from queued players as fallback
                const queuedPlayer = this.queuedPlayers.get(playerId);
                if (queuedPlayer && queuedPlayer.publicWallet) {
                    winners.push({
                        playerId: playerId,
                        publicWallet: queuedPlayer.publicWallet,
                        username: queuedPlayer.username || 'Player'
                    });
                } else {
                    console.warn(`[RoundManager] Winner ${playerId} has no wallet address stored`);
                }
            }
        }
        
        // Stop player updates but keep game loop running (for animations)
        this.gameLoop.setGameEnded(true);
        
        // Notify game end immediately (so clients know the round ended and can stop player updates)
        if (this.onGameEnd) {
            this.onGameEnd({
                round: this.currentRound,
                winners: winnerIds,
                reason: this.gameTimeRemaining <= 0 ? 'time' : 'elimination'
            });
        }
        
        // Notify round end
        if (this.onRoundEnd) {
            this.onRoundEnd({
                round: this.currentRound,
                winners: winnerIds
            });
        }
        
        // ===== DISTRIBUTE TOKENS TO WINNERS (BEFORE STARTING NEXT QUEUE) =====
        console.log('[RoundManager] ===== Starting token distribution to winners =====');
        
        let tokensDistributed = false;
        let leftoverTokens = this.currentTokenAmount;
        let leftoverTokenAccount = this.currentTokenAccount;
        let leftoverTokenMint = this.currentTokenMint;
        
        if (this.currentTokenAmount > 0 && this.currentTokenAccount && this.currentTokenMint) {
            if (winners.length > 0) {
                console.log(`[RoundManager] 🎁 Distributing ${this.currentTokenAmount.toLocaleString()} tokens to ${winners.length} winners...`);
                
                try {
                    const adminConfig = await AdminConfig.findOne();
                    if (adminConfig && adminConfig.potWalletPrivate) {
                        const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
                        const potWalletPrivateKey = decrypt(adminConfig.potWalletPrivate);
                        
                        if (potWalletPrivateKey) {
                            // Filter winners with valid wallet addresses
                            const winnersWithWallets = winners.filter(w => w.publicWallet && w.publicWallet.trim() !== '');
                            
                            if (winnersWithWallets.length > 0) {
                                const distributeResult = await distributeTokensToWinners(
                                    potWalletPrivateKey,
                                    this.currentTokenMint,
                                    this.currentTokenAccount,
                                    winnersWithWallets,
                                    this.currentTokenAmount,
                                    rpcEndpoint
                                );
                                
                                if (distributeResult.success) {
                                    console.log(`[RoundManager] ✅ Tokens distributed to ${distributeResult.signatures?.length || 0} winners`);
                                    console.log(`[RoundManager]    Signatures: ${distributeResult.signatures?.join(', ') || 'N/A'}`);
                                    tokensDistributed = true;
                                    leftoverTokens = 0; // All tokens distributed
                                    leftoverTokenAccount = null;
                                    leftoverTokenMint = null;
                                    
                                    // Track sent tokens in statistics
                                    if (distributeResult.formattedDistributedAmount > 0) {
                                        try {
                                            const stats = await TokenStats.getStats();
                                            await stats.addSentTokens(distributeResult.formattedDistributedAmount);
                                            console.log(`[RoundManager] 📊 Updated token stats: +${distributeResult.formattedDistributedAmount.toLocaleString()} sent`);
                                        } catch (error) {
                                            console.warn(`[RoundManager] ⚠️  Failed to update token stats: ${error.message}`);
                                        }
                                    }
                                    
                                    // Track player statistics
                                    await this.updatePlayerStats(winnersWithWallets, distributeResult.formattedDistributedAmount || 0);
                                    
                                    // Send system message about token distribution
                                    if (this.socketHandler && distributeResult.formattedDistributedAmount) {
                                        const adminConfig = await AdminConfig.findOne();
                                        const tokenSymbol = adminConfig?.tokenTicker || '$SLIDE';
                                        const formattedAmount = distributeResult.formattedDistributedAmount.toLocaleString();
                                        const winnerCount = winnersWithWallets.length;
                                        this.socketHandler.sendSystemMessage(`Sending ${formattedAmount} ${tokenSymbol} to ${winnerCount} winner${winnerCount !== 1 ? 's' : ''}`);
                                    }
                                } else {
                                    console.error(`[RoundManager] ❌ Failed to distribute tokens: ${distributeResult.error}`);
                                    console.log(`[RoundManager]    Keeping ${leftoverTokens.toLocaleString()} tokens for next round`);
                                }
                            } else {
                                console.log('[RoundManager] ⚠️  No winners with valid wallet addresses to distribute tokens to');
                                console.log(`[RoundManager]    Keeping ${leftoverTokens.toLocaleString()} tokens for next round`);
                            }
                        }
                    }
                } catch (error) {
                    console.error('[RoundManager] ❌ Error distributing tokens:', error);
                    console.log(`[RoundManager]    Keeping ${leftoverTokens.toLocaleString()} tokens for next round`);
                }
            } else {
                console.log(`[RoundManager] ℹ️  No winners - keeping ${leftoverTokens.toLocaleString()} tokens for next round`);
            }
        } else {
            if (this.currentTokenAmount === 0) {
                console.log('[RoundManager] ℹ️  No tokens to distribute (pot was empty or too small)');
            } else {
                console.log('[RoundManager] ℹ️  Token info incomplete, cannot distribute');
            }
        }
        
        console.log('[RoundManager] ===== Token distribution completed =====');
        
        // Update player statistics for all participants (games played)
        await this.updateAllPlayersGamePlayed();
        
        // Store leftover tokens for next round (if any)
        if (leftoverTokens > 0 && leftoverTokenAccount && leftoverTokenMint) {
            console.log(`[RoundManager] 💰 Keeping ${leftoverTokens.toLocaleString()} leftover tokens for next round`);
            // These will be preserved and added to the next round's tokens
        } else {
            // No leftover tokens, reset everything
            leftoverTokens = 0;
            leftoverTokenAccount = null;
            leftoverTokenMint = null;
        }
        
        // Wait 5 seconds before removing players and starting next queue
        setTimeout(async () => {
            // Remove all remaining players from the game
            for (const playerId of winnerIds) {
                this.gameLoop.removePlayer(playerId);
                // Clean up player wallet info
                this.playerWallets.delete(playerId);
            }
            
            console.log(`[RoundManager] Removed ${winnerIds.length} players at round end`);
            
            // Reset all walls after removing players (ready for next round)
            if (this.gameLoop && this.gameLoop.getWallManager) {
                this.gameLoop.getWallManager().resetWalls();
                
                // Broadcast wall reset to all clients
                if (this.socketHandler && this.socketHandler.io) {
                    this.socketHandler.io.emit('walls:reset');
                }
            }
            
            // Store leftover tokens for next round (will be added to new round's tokens)
            if (leftoverTokens > 0 && leftoverTokenAccount && leftoverTokenMint) {
                // Keep these values for next round
                this.currentTokenAmount = leftoverTokens;
                // Format leftover tokens for display
                try {
                    const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
                    const connection = new Connection(rpcEndpoint, 'confirmed');
                    const tokenMint = new PublicKey(leftoverTokenMint);
                    const decimals = await getTokenDecimals(connection, tokenMint);
                    this.currentFormattedTokenAmount = formatTokenAmount(BigInt(leftoverTokens), decimals);
                } catch (error) {
                    // If formatting fails, use leftover tokens as-is
                    this.currentFormattedTokenAmount = leftoverTokens;
                }
                this.currentTokenAccount = leftoverTokenAccount;
                this.currentTokenMint = leftoverTokenMint;
                console.log(`[RoundManager] 💰 Preserving ${this.currentFormattedTokenAmount.toLocaleString()} tokens for next round`);
            } else {
                // Reset pot info for next round
                this.currentPotAmount = 0;
                this.currentPotAmountSol = 0;
                this.currentTokenAmount = 0;
                this.currentFormattedTokenAmount = 0;
                this.currentTokenAccount = null;
                this.currentTokenMint = null;
            }
            
            // Reset game ended flag and restart game loop (it will be ready for next game)
            this.gameLoop.setGameEnded(false);
            this.gameLoop.start();
            
            // Reset fees processed flag for the next round
            // This ensures we process fees again for the new round
            this.feesProcessedForRound = 0;
            
            // Start next queue (this will claim fees and buy new tokens, which will be added to any leftover tokens)
            // Check if game is paused before starting
            this.startQueue();
        }, 5000); // 5 second delay before removing players and starting next queue
    }

    async claimCreatorFees() {
        // Check if game is paused before claiming fees
        const adminConfig = await AdminConfig.findOne();
        if (adminConfig && adminConfig.gamePaused) {
            console.log('[RoundManager] ⏸️  Game is paused - skipping fee claim/buy process');
            return;
        }
        
        console.log('[RoundManager] ===== Starting creator fee claim process =====');
        const startTime = Date.now();
        
        try {
            // Step 1: Claim and transfer fees
            const result = await claimAndTransferFees();
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            
            if (result.success) {
                if (result.claimed && result.transferred) {
                    console.log(`[RoundManager] ✅ SUCCESS - Creator fees claimed and transferred!`);
                    console.log(`[RoundManager]    Claim TX: https://solscan.io/tx/${result.claimSignature}`);
                    console.log(`[RoundManager]    Transfer TX: https://solscan.io/tx/${result.transferSignature}`);
                    console.log(`[RoundManager]    Amount transferred: ${result.transferAmount?.toFixed(4) || 'unknown'} SOL`);
                    console.log(`[RoundManager]    Duration: ${duration}s`);
                } else if (result.claimed) {
                    console.log(`[RoundManager] ⚠️  PARTIAL - Fees claimed but no SOL to transfer`);
                    console.log(`[RoundManager]    Claim TX: https://solscan.io/tx/${result.claimSignature}`);
                    console.log(`[RoundManager]    Reason: ${result.message || 'Insufficient balance'}`);
                    console.log(`[RoundManager]    Duration: ${duration}s`);
                } else if (result.transferred) {
                    console.log(`[RoundManager] ⚠️  PARTIAL - SOL transferred but no new fees to claim`);
                    console.log(`[RoundManager]    Transfer TX: https://solscan.io/tx/${result.transferSignature}`);
                    console.log(`[RoundManager]    Amount transferred: ${result.transferAmount?.toFixed(4) || 'unknown'} SOL`);
                    console.log(`[RoundManager]    Duration: ${duration}s`);
                } else {
                    console.log(`[RoundManager] ℹ️  INFO - No fees to claim and no SOL to transfer`);
                    console.log(`[RoundManager]    Message: ${result.message || 'No action needed'}`);
                    console.log(`[RoundManager]    Duration: ${duration}s`);
                }
            } else {
                console.error(`[RoundManager] ❌ FAILED - Error during fee claim/transfer process`);
                console.error(`[RoundManager]    Error: ${result.error}`);
                console.error(`[RoundManager]    Duration: ${duration}s`);
            }
            
            // Step 2: Calculate pot and buy tokens (even if no fees were claimed)
            console.log('[RoundManager] ===== Calculating pot and buying tokens =====');
            
            // Check if we have leftover tokens from previous round
            const leftoverTokens = this.currentTokenAmount || 0;
            const leftoverTokenAccount = this.currentTokenAccount;
            const leftoverTokenMint = this.currentTokenMint;
            
            if (leftoverTokens > 0 && leftoverTokenAccount && leftoverTokenMint) {
                console.log(`[RoundManager] 💰 Found ${leftoverTokens.toLocaleString()} leftover tokens from previous round`);
            }
            
            // Prepare callbacks for real-time updates
            const adminConfigForCallbacks = await AdminConfig.findOne();
            const tokenSymbol = adminConfigForCallbacks?.tokenTicker || '$SLIDE';
            const roundNumber = this.currentRound + 1;
            
            // Flags to prevent duplicate messages
            let buyMessageSent = false;
            let burnMessageSent = false;
            
            const potResult = await calculatePotAndBuyTokens({
                onBuyComplete: async (buyData) => {
                    // Send buy message immediately (only once)
                    if (!buyMessageSent && this.socketHandler && buyData.formattedAmount > 0) {
                        buyMessageSent = true;
                        const buyLink = `https://solscan.io/tx/${buyData.buySignature}`;
                        this.socketHandler.sendSystemMessage(`Bought ${buyData.formattedAmount.toLocaleString()} ${tokenSymbol} for round ${roundNumber} | <a href="${buyLink}" target="_blank" rel="noopener noreferrer">${buyLink}</a>`);
                    }
                    
                    // Update pot amount immediately in queue countdown
                    this.currentPotAmountSol = buyData.potAmountSol;
                    if (this.onQueueUpdate) {
                        const adminConfig = await AdminConfig.findOne();
                        this.onQueueUpdate({
                            timeRemaining: this.queueTimeRemaining,
                            playerCount: this.getPlayerCount(),
                            isInQueue: true,
                            potAmount: this.currentPotAmountSol,
                            tokenAmount: this.currentFormattedTokenAmount || 0,
                            tokenTicker: adminConfig?.tokenTicker || '$SLIDE'
                        });
                    }
                },
                onBurnComplete: (burnData) => {
                    // Send burn message immediately (only once)
                    if (!burnMessageSent && this.socketHandler && burnData.formattedBurnedAmount > 0) {
                        burnMessageSent = true;
                        const burnLink = `https://solscan.io/tx/${burnData.burnSignature}`;
                        this.socketHandler.sendSystemMessage(`Burned ${burnData.formattedBurnedAmount.toLocaleString()} ${tokenSymbol} for round ${roundNumber} | <a href="${burnLink}" target="_blank" rel="noopener noreferrer">${burnLink}</a>`);
                    }
                }
            });
            
            if (potResult.success) {
                // Store pot info for this round
                this.currentPotAmount = potResult.potAmount || 0;
                this.currentPotAmountSol = potResult.potAmountSol || 0;
                
                // Add leftover tokens to newly purchased tokens
                const newTokens = potResult.tokenAmount || 0;
                const totalTokens = leftoverTokens + newTokens;
                
                this.currentTokenAmount = totalTokens;
                this.currentTokenAccount = potResult.tokenAccount || leftoverTokenAccount || null;
                
                // Get token mint from admin config
                const adminConfig = await AdminConfig.findOne();
                if (adminConfig && adminConfig.tokenContractAddress) {
                    this.currentTokenMint = adminConfig.tokenContractAddress;
                } else if (leftoverTokenMint) {
                    this.currentTokenMint = leftoverTokenMint;
                }
                
                // Get formatted amounts for display
                const formattedNewTokens = potResult.formattedTokenAmount || newTokens;
                
                // Calculate formatted total (leftover tokens are already formatted from previous round)
                // If we have leftover tokens, we need to get their formatted value
                let formattedLeftoverTokens = 0;
                if (leftoverTokens > 0) {
                    // Try to format leftover tokens using token decimals
                    try {
                        const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
                        const connection = new Connection(rpcEndpoint, 'confirmed');
                        const tokenMint = new PublicKey(this.currentTokenMint || adminConfig?.tokenContractAddress || '');
                        const decimals = await getTokenDecimals(connection, tokenMint);
                        formattedLeftoverTokens = formatTokenAmount(BigInt(leftoverTokens), decimals);
                    } catch (error) {
                        // If formatting fails, use leftover tokens as-is (they might already be formatted)
                        formattedLeftoverTokens = leftoverTokens;
                    }
                }
                
                const formattedTotalTokens = formattedLeftoverTokens + formattedNewTokens;
                this.currentFormattedTokenAmount = formattedTotalTokens;
                
                console.log(`[RoundManager] ✅ Pot calculated: ${this.currentPotAmountSol.toFixed(4)} SOL`);
                if (leftoverTokens > 0) {
                    console.log(`[RoundManager]    New tokens purchased: ${formattedNewTokens.toLocaleString()}`);
                    console.log(`[RoundManager]    Leftover tokens: ${formattedLeftoverTokens.toLocaleString()}`);
                    console.log(`[RoundManager]    Total tokens for this round: ${formattedTotalTokens.toLocaleString()}`);
                } else {
                    console.log(`[RoundManager]    Tokens purchased: ${formattedNewTokens.toLocaleString()}`);
                }
            } else {
                console.error(`[RoundManager] ❌ Failed to calculate pot/buy tokens: ${potResult.error}`);
                
                // If we have leftover tokens, keep them even if buying new tokens failed
                if (leftoverTokens > 0 && leftoverTokenAccount && leftoverTokenMint) {
                    this.currentPotAmount = 0;
                    this.currentPotAmountSol = 0;
                    this.currentTokenAmount = leftoverTokens;
                    // Format leftover tokens for display
                    try {
                        const rpcEndpoint = process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com';
                        const connection = new Connection(rpcEndpoint, 'confirmed');
                        const tokenMint = new PublicKey(leftoverTokenMint);
                        const decimals = await getTokenDecimals(connection, tokenMint);
                        this.currentFormattedTokenAmount = formatTokenAmount(BigInt(leftoverTokens), decimals);
                    } catch (error) {
                        this.currentFormattedTokenAmount = leftoverTokens;
                    }
                    this.currentTokenAccount = leftoverTokenAccount;
                    this.currentTokenMint = leftoverTokenMint;
                    console.log(`[RoundManager] 💰 Keeping ${this.currentFormattedTokenAmount.toLocaleString()} leftover tokens despite buy failure`);
                } else {
                    this.currentPotAmount = 0;
                    this.currentPotAmountSol = 0;
                    this.currentTokenAmount = 0;
                    this.currentFormattedTokenAmount = 0;
                    this.currentTokenAccount = null;
                    this.currentTokenMint = null;
                }
            }
            
            console.log('[RoundManager] ===== Creator fee claim process completed =====');
        } catch (error) {
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.error('[RoundManager] ❌ EXCEPTION - Unexpected error in claimCreatorFees:', error);
            console.error(`[RoundManager]    Duration: ${duration}s`);
            console.error('[RoundManager] ===== Creator fee claim process failed =====');
        }
    }

    // Update player statistics for winners (tokens won and games won)
    async updatePlayerStats(winners, totalTokensDistributed) {
        if (!winners || winners.length === 0 || totalTokensDistributed <= 0) {
            return;
        }
        
        const tokensPerWinner = totalTokensDistributed / winners.length;
        
        for (const winner of winners) {
            try {
                // Use publicWallet as identifier, fallback to playerId if no wallet
                const identifier = winner.publicWallet && winner.publicWallet.trim() !== '' 
                    ? winner.publicWallet.trim() 
                    : winner.playerId;
                
                // Get or create player stats
                const stats = await PlayerStats.getOrCreateStats(
                    identifier,
                    winner.username || 'Player',
                    winner.publicWallet || ''
                );
                
                // Add tokens won
                await stats.addTokensWon(tokensPerWinner);
                
                // Add game won
                await stats.addGameWon();
                
                console.log(`[RoundManager] 📊 Updated stats for ${winner.username}: +${tokensPerWinner.toFixed(2)} tokens, +1 win`);
            } catch (error) {
                console.warn(`[RoundManager] ⚠️  Failed to update stats for winner ${winner.username}: ${error.message}`);
            }
        }
    }

    // Update player statistics for all game participants (games played)
    async updateAllPlayersGamePlayed() {
        if (!this.gameParticipants || this.gameParticipants.size === 0) {
            return;
        }
        
        for (const playerId of this.gameParticipants) {
            try {
                const playerData = this.playerWallets.get(playerId) || this.queuedPlayers.get(playerId);
                if (!playerData) continue;
                
                // Use publicWallet as identifier, fallback to playerId if no wallet
                const identifier = playerData.publicWallet && playerData.publicWallet.trim() !== '' 
                    ? playerData.publicWallet.trim() 
                    : playerId;
                
                // Get or create player stats
                const stats = await PlayerStats.getOrCreateStats(
                    identifier,
                    playerData.username || 'Player',
                    playerData.publicWallet || ''
                );
                
                // Add game played
                await stats.addGamePlayed();
            } catch (error) {
                console.warn(`[RoundManager] ⚠️  Failed to update games played for player ${playerId}: ${error.message}`);
            }
        }
        
        // Clear participants for next game
        this.gameParticipants.clear();
    }

    async getState() {
        const adminConfig = await AdminConfig.findOne();
        return {
            isInQueue: this.isInQueue,
            isInGame: this.isInGame,
            currentRound: this.currentRound,
            queueTimeRemaining: this.queueTimeRemaining,
            gameTimeRemaining: this.gameTimeRemaining,
            playerCount: this.getPlayerCount(),
            queuedPlayerCount: this.queuedPlayers.size,
            aliveCount: this.isInGame ? this.getAlivePlayerCount() : 0,
            potAmount: this.currentPotAmountSol,
            tokenAmount: this.currentFormattedTokenAmount || 0,
            tokenTicker: adminConfig?.tokenTicker || '$SLIDE'
        };
    }
}

module.exports = RoundManager;

