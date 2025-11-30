// Client-side round manager - handles queue and game round UI
class ClientRoundManager {
    constructor() {
        this.isInQueue = false;
        this.isInGame = false;
        this.queueTimeRemaining = 0;
        this.gameTimeRemaining = 0;
        this.playerCount = 0;
        this.aliveCount = 0;
        this.currentRound = 0;
        this.isGameEnding = false; // Flag to prevent showing queue during 5s freeze
        this.shouldAutoOpenChat = false; // Flag to auto-open chat after game ends
        
        // UI elements
        this.queueContainer = document.getElementById('queue-countdown');
        this.queueTimeElement = document.getElementById('queue-time');
        this.queuePlayersElement = document.getElementById('queue-players');
        this.queuePotElement = document.getElementById('queue-pot');
        this.tokenStatsContainer = document.getElementById('token-stats');
        this.leaderboardContainer = document.getElementById('leaderboard');
        this.howItWorksContainer = document.getElementById('how-it-works');
        
        // Phaser scene reference (set when game initializes)
        this.gameScene = null;
        this.gameTimerText = null;
    }

    setGameScene(scene) {
        this.gameScene = scene;
        this.createGameTimer();
    }

    createGameTimer() {
        if (!this.gameScene) return;
        
        // Create game timer text in Phaser
        this.gameTimerText = this.gameScene.add.text(
            GameConfig.GAME_WIDTH / 2,
            40,
            '3:00',
            {
                fontSize: '32px',
                fill: '#00ffff',
                align: 'center',
                fontFamily: 'Arial',
                stroke: '#000000',
                strokeThickness: 4
            }
        );
        this.gameTimerText.setOrigin(0.5, 0.5);
        this.gameTimerText.setDepth(1000);
        this.gameTimerText.setVisible(false);
    }

    formatTime(milliseconds) {
        const totalSeconds = Math.ceil(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    updateQueue(state) {
        this.isInQueue = state.isInQueue;
        this.queueTimeRemaining = state.timeRemaining;
        this.playerCount = state.playerCount || state.queuedPlayerCount || 0;
        
        // Clear game ending flag when we receive a proper queue update (queue has been reset)
        // This means the 5 second freeze is over and queue is ready
        if (this.isGameEnding && state.timeRemaining >= 59000) {
            // Queue has been reset to full duration (1 minute = 60000ms, allow some tolerance)
            this.isGameEnding = false;
            // Set flag to auto-open chat when UI elements are shown
            this.shouldAutoOpenChat = true;
        }
        
        // Show queue whenever we're not in an active game AND not in the 5s freeze period
        if (!this.isInGame && !this.isGameEnding) {
            // Show queue countdown
            if (this.queueContainer) {
                this.queueContainer.classList.add('active');
                if (this.queueTimeElement) {
                    this.queueTimeElement.textContent = this.formatTime(this.queueTimeRemaining);
                }
                if (this.queuePlayersElement) {
                    this.queuePlayersElement.textContent = `Players: ${this.playerCount}/2`;
                }
                if (this.queuePotElement) {
                    const potAmount = state.potAmount || 0;
                    const tokenAmount = state.tokenAmount || 0;
                    const tokenTicker = state.tokenTicker || '$SYMBOL';
                    
                    // Update SOL amount
                    const solElement = document.getElementById('queue-pot-sol');
                    if (solElement) {
                        solElement.textContent = `${potAmount.toFixed(2)} SOL`;
                    }
                    
                    // Update token amount
                    const tokenElement = document.getElementById('queue-pot-token');
                    if (tokenElement) {
                        const formattedTokenAmount = tokenAmount.toLocaleString('en-US', {
                            maximumFractionDigits: 0,
                            minimumFractionDigits: 0
                        });
                        tokenElement.textContent = `${formattedTokenAmount} ${tokenTicker}`;
                    }
                }
            }
            // Show token statistics during queue (if user hasn't hidden them)
            if (this.tokenStatsContainer) {
                const shouldShow = !window.userFormManager || window.userFormManager.uiElementsVisible;
                if (shouldShow) {
                    this.tokenStatsContainer.classList.add('active');
                }
            }
            // Show leaderboard during queue (if user hasn't hidden them)
            if (this.leaderboardContainer) {
                const shouldShow = !window.userFormManager || window.userFormManager.uiElementsVisible;
                if (shouldShow) {
                    this.leaderboardContainer.classList.add('active');
                }
            }
            // Show how it works during queue (if user hasn't hidden them)
            if (this.howItWorksContainer) {
                const shouldShow = !window.userFormManager || window.userFormManager.uiElementsVisible;
                if (shouldShow) {
                    this.howItWorksContainer.classList.add('active');
                }
            }
            // Show join button during queue
            if (window.userFormManager) {
                window.userFormManager.showJoinButtonContainer();
            }
            
            // Automatically open chat when UI elements are shown after game ends
            // Only open if chat is not already visible and we should auto-open
            if (this.shouldAutoOpenChat && window.chatManager && !window.chatManager.isGameActive && !window.chatManager.isVisible) {
                // Small delay to ensure UI elements are fully visible
                setTimeout(() => {
                    if (window.chatManager && !window.chatManager.isGameActive && !window.chatManager.isVisible) {
                        window.chatManager.openChat();
                    }
                }, 100);
                // Clear flag so we don't try to open again
                this.shouldAutoOpenChat = false;
            }
        } else {
            // Hide queue countdown when game is active or during freeze
            if (this.queueContainer) {
                this.queueContainer.classList.remove('active');
            }
            // Hide token statistics during game
            if (this.tokenStatsContainer) {
                this.tokenStatsContainer.classList.remove('active');
            }
        }
    }

    updateGame(state) {
        this.isInGame = state.isInGame;
        this.gameTimeRemaining = state.timeRemaining;
        this.aliveCount = state.aliveCount;
        
        if (this.isInGame && this.gameTimerText) {
            // Show game timer
            this.gameTimerText.setVisible(true);
            this.gameTimerText.setText(this.formatTime(this.gameTimeRemaining));
        } else if (this.gameTimerText) {
            // Hide game timer
            this.gameTimerText.setVisible(false);
        }
    }
    
    // Update game timer in real-time (called from game scene update loop)
    updateGameTimer() {
        if (this.isInGame && this.gameTimerText && this.gameTimeRemaining > 0) {
            this.gameTimerText.setText(this.formatTime(this.gameTimeRemaining));
        }
    }

    handleGameStart(data) {
        console.log('[ClientRoundManager] Game started - Round', data.round);
        this.currentRound = data.round;
        
        // Notify chat manager that game is active
        if (window.chatManager) {
            window.chatManager.setGameActive(true);
        }
        
        // Hide queue countdown
        if (this.queueContainer) {
            this.queueContainer.classList.remove('active');
        }
        
        // Hide token statistics during game
        if (this.tokenStatsContainer) {
            this.tokenStatsContainer.classList.remove('active');
        }
        
        // Hide leaderboard during game
        if (this.leaderboardContainer) {
            this.leaderboardContainer.classList.remove('active');
        }
        if (this.howItWorksContainer) {
            this.howItWorksContainer.classList.remove('active');
        }
        
        // Show game timer
        if (this.gameTimerText) {
            this.gameTimerText.setVisible(true);
        }
    }

    handleGameEnd(data) {
        console.log('[ClientRoundManager] Game ended - Round', data.round);
        console.log('[ClientRoundManager] Winners:', data.winners);
        console.log('[ClientRoundManager] Reason:', data.reason);
        
        // Notify chat manager that game ended (can show chat again)
        if (window.chatManager) {
            window.chatManager.setGameActive(false);
        }
        
        // Hide game timer
        if (this.gameTimerText) {
            this.gameTimerText.setVisible(false);
        }
        
        // Set flag to prevent showing queue during 5 second freeze
        this.isGameEnding = true;
        
        // Hide queue countdown during freeze period
        if (this.queueContainer) {
            this.queueContainer.classList.remove('active');
        }
        
        // Hide token statistics during freeze period
        if (this.tokenStatsContainer) {
            this.tokenStatsContainer.classList.remove('active');
        }
        
        // Hide leaderboard during freeze period
        if (this.leaderboardContainer) {
            this.leaderboardContainer.classList.remove('active');
        }
        if (this.howItWorksContainer) {
            this.howItWorksContainer.classList.remove('active');
        }
        // Hide join button during freeze period
        if (window.userFormManager) {
            window.userFormManager.hideJoinButton();
            // Reset join button state since player is no longer in queue (they were playing)
            // This allows them to join the next round's queue
            window.userFormManager.resetJoinButton();
        }
        
        // Reset game state
        this.isInGame = false;
        this.gameTimeRemaining = 0;
    }

    handleRoundState(state) {
        // Update queue state (show if not in game)
        if (!state.isInGame) {
            this.updateQueue({
                isInQueue: state.isInQueue || true, // Always show queue when not in game
                timeRemaining: state.queueTimeRemaining || 0,
                playerCount: state.queuedPlayerCount || state.playerCount || 0,
                potAmount: state.potAmount || 0,
                tokenAmount: state.tokenAmount || 0,
                tokenTicker: state.tokenTicker || '$SYMBOL'
            });
        } else {
            // Hide queue when game is active
            if (this.queueContainer) {
                this.queueContainer.classList.remove('active');
            }
            // Hide token statistics when game is active
            if (this.tokenStatsContainer) {
                this.tokenStatsContainer.classList.remove('active');
            }
            // Hide leaderboard when game is active
            if (this.leaderboardContainer) {
                this.leaderboardContainer.classList.remove('active');
            }
            // Hide how it works when game is active
            if (this.howItWorksContainer) {
                this.howItWorksContainer.classList.remove('active');
            }
            // Hide how it works when game is active or during freeze
            if (this.howItWorksContainer) {
                this.howItWorksContainer.classList.remove('active');
            }
            // Hide join button when game is active or during freeze
            if (window.userFormManager) {
                window.userFormManager.hideJoinButton();
            }
        }
        
        // Update game state
        if (state.isInGame) {
            this.updateGame({
                isInGame: true,
                timeRemaining: state.gameTimeRemaining,
                aliveCount: state.aliveCount
            });
        } else {
            // Not in game, hide game timer
            this.updateGame({
                isInGame: false,
                timeRemaining: 0,
                aliveCount: 0
            });
        }
    }
}

// Initialize client round manager
const clientRoundManager = new ClientRoundManager();
window.clientRoundManager = clientRoundManager;

