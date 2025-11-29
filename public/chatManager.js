// Chat Manager - handles chat UI and socket communication
class ChatManager {
    constructor() {
        this.socket = null;
        this.chatContainer = null;
        this.chatToggleBtn = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.chatSendBtn = null;
        this.isVisible = false;
        this.isGameActive = false;
        this.currentUsername = null;
    }

    init(socket) {
        this.socket = socket;
        this.chatContainer = document.getElementById('chat-container');
        this.chatToggleBtn = document.getElementById('chat-toggle-btn');
        this.chatMessages = document.getElementById('chat-messages');
        this.chatInput = document.getElementById('chat-input');
        this.chatSendBtn = document.getElementById('chat-send-btn');
        const chatCloseBtn = document.getElementById('chat-close-btn');

        // Set up socket listeners
        if (this.socket) {
            this.socket.on('chat:message', (data) => {
                const isSystem = data.isSystem || data.username === 'system';
                this.addMessage(data.username, data.message, data.timestamp, true, isSystem);
            });
            
            // Receive chat history when connecting
            this.socket.on('chat:history', (history) => {
                this.loadChatHistory(history);
            });
        }

        // Set up UI event listeners
        this.chatSendBtn.addEventListener('click', () => this.sendMessage());
        this.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });
        chatCloseBtn.addEventListener('click', () => this.closeChat());
        this.chatToggleBtn.addEventListener('click', () => this.openChat());

        // Load username from user data
        if (window.userFormManager) {
            const userData = window.userFormManager.getUserData();
            if (userData && userData.username) {
                this.currentUsername = userData.username;
            }
        }

        // Listen for username updates
        window.addEventListener('userDataUpdated', (event) => {
            if (event.detail && event.detail.username) {
                this.currentUsername = event.detail.username;
            }
        });

        // Initially show chat if not in game
        this.updateVisibility();
        
        // Open chat by default
        if (!this.isGameActive) {
            this.openChat();
        }
    }

    setGameActive(isActive) {
        this.isGameActive = isActive;
        this.updateVisibility();
    }

    updateVisibility() {
        // Show chat only when not in game (spectating or in queue)
        if (!this.isGameActive) {
            // Chat should be visible (either open or toggle button visible)
            if (!this.isVisible) {
                this.chatToggleBtn.classList.add('visible');
            }
        } else {
            // Hide chat during game
            this.closeChat();
            this.chatToggleBtn.classList.remove('visible');
        }
    }

    openChat() {
        if (this.isGameActive) return; // Don't open during game
        
        this.isVisible = true;
        this.chatContainer.classList.add('visible');
        this.chatToggleBtn.classList.remove('visible');
        this.chatInput.focus();
    }

    closeChat() {
        this.isVisible = false;
        this.chatContainer.classList.remove('visible');
        if (!this.isGameActive) {
            this.chatToggleBtn.classList.add('visible');
        }
    }

    sendMessage() {
        const message = this.chatInput.value.trim();
        if (!message || !this.socket) return;

        // Get current username
        let username = this.currentUsername;
        if (!username && window.userFormManager) {
            const userData = window.userFormManager.getUserData();
            username = userData ? userData.username : 'Anonymous';
        }
        if (!username) {
            username = 'Anonymous';
        }

        // Send message to server
        this.socket.emit('chat:message', {
            username: username,
            message: message
        });

        // Clear input
        this.chatInput.value = '';
    }

    addMessage(username, message, timestamp, scroll = true, isSystem = false) {
        if (!this.chatMessages) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = isSystem ? 'chat-message system-message' : 'chat-message';

        const timeStr = timestamp ? this.formatTime(timestamp) : this.formatTime(Date.now());
        
        if (isSystem) {
            // For system messages, allow HTML (for links) but escape the rest
            // We need to be careful - only allow links that match our safe pattern
            let safeMessage = message;
            
            // Check if message contains our safe link pattern (Solscan transaction links)
            const linkPattern = /<a href="(https:\/\/solscan\.io\/tx\/[A-Za-z0-9]+)"[^>]*>([^<]+)<\/a>/g;
            const hasSafeLinks = linkPattern.test(message);
            
            if (hasSafeLinks) {
                // Message contains our safe link pattern, allow it
                // But escape any other HTML that might be in the message
                // Split the message and escape non-link parts
                const parts = message.split(/(<a href="https:\/\/solscan\.io\/tx\/[A-Za-z0-9]+"[^>]*>[^<]+<\/a>)/g);
                safeMessage = parts.map(part => {
                    if (part.match(linkPattern)) {
                        return part; // Keep the link as-is
                    } else {
                        return this.escapeHtml(part); // Escape everything else
                    }
                }).join('');
            } else {
                // No safe links, escape everything
                safeMessage = this.escapeHtml(message);
            }
            
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="system-label">system:</span>
                    <span class="timestamp">${timeStr}</span>
                </div>
                <div class="message-content">
                    <span class="system-text">${safeMessage}</span>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-header">
                    <span class="username">${this.escapeHtml(username)}:</span>
                    <span class="timestamp">${timeStr}</span>
                </div>
                <div class="message-content">
                    <span>${this.escapeHtml(message)}</span>
                </div>
            `;
        }

        this.chatMessages.appendChild(messageDiv);
        
        // Auto-scroll to bottom (only if scroll is true)
        if (scroll) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    loadChatHistory(history) {
        if (!this.chatMessages || !Array.isArray(history)) return;
        
        // Clear existing messages
        this.chatMessages.innerHTML = '';
        
        // Add all messages from history
        history.forEach(msg => {
            const isSystem = msg.isSystem || msg.username === 'system';
            this.addMessage(msg.username, msg.message, msg.timestamp, false, isSystem);
        });
        
        // Scroll to bottom after loading
        setTimeout(() => {
            if (this.chatMessages) {
                this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
            }
        }, 100);
    }
}

// Initialize chat manager when socket is available
let chatManager;
window.addEventListener('socketReady', (event) => {
    if (event.detail && event.detail.socket) {
        if (!chatManager) {
            chatManager = new ChatManager();
            window.chatManager = chatManager; // Make globally accessible
        }
        chatManager.init(event.detail.socket);
    }
});

// Initialize chat manager on page load (will connect to socket when available)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!chatManager) {
            chatManager = new ChatManager();
            window.chatManager = chatManager;
        }
    });
} else {
    if (!chatManager) {
        chatManager = new ChatManager();
        window.chatManager = chatManager;
    }
}

