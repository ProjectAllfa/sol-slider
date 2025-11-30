// User form manager - handles username/wallet input and join button
class UserFormManager {
    constructor() {
        this.clientId = this.getOrCreateClientId();
        this.userData = null;
        this.formContainer = null;
        this.joinButtonContainer = null;
        this.isJoined = false;
        this.uiElementsVisible = this.loadUIElementsVisibility(); // Load saved state
    }

    // Get existing clientId from localStorage or create a new one
    getOrCreateClientId() {
        let clientId = localStorage.getItem('gameClientId');
        if (!clientId) {
            // Generate a unique client ID
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('gameClientId', clientId);
        }
        return clientId;
    }

    // Load user data from server (optional, doesn't block)
    async loadUserData() {
        try {
            const response = await fetch(`/api/user?clientId=${encodeURIComponent(this.clientId)}`);
            if (response.ok) {
                const data = await response.json();
                this.userData = data;
                return true;
            } else if (response.status === 404 || response.status === 503) {
                // User doesn't exist yet or DB unavailable - that's fine
                return false;
            } else {
                console.warn('Error loading user data:', response.statusText);
                return false;
            }
        } catch (error) {
            console.warn('Error loading user data:', error);
            return false;
        }
    }

    // Save user data to server
    async saveUserData(username, publicWallet) {
        try {
            const response = await fetch('/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId: this.clientId,
                    username: username,
                    publicWallet: publicWallet
                })
            });

            if (response.ok) {
                const data = await response.json();
                this.userData = { username: data.username, publicWallet: data.publicWallet };
                return true;
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save user data');
            }
        } catch (error) {
            console.warn('Error saving user data:', error);
            throw error;
        }
    }

    // Create and show the user form
    showForm() {
        // Create form container
        this.formContainer = document.createElement('div');
        this.formContainer.id = 'user-form-container';
        this.formContainer.innerHTML = `
            <div class="user-form-box">
                <button class="close-btn" id="close-form-btn" title="Close">×</button>
                <h2>Enter Your Details</h2>
                <form id="user-form">
                    <div class="form-group">
                        <label for="username">Username <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="username" 
                            name="username" 
                            required 
                            maxlength="50"
                            placeholder="Enter your username"
                            autocomplete="off"
                        />
                    </div>
                    <div class="form-group">
                        <label for="publicWallet">Public Wallet <span class="required">*</span></label>
                        <input 
                            type="text" 
                            id="publicWallet" 
                            name="publicWallet" 
                            required 
                            maxlength="200"
                            placeholder="Enter your public wallet address"
                            autocomplete="off"
                        />
                    </div>
                    <div class="form-error" id="form-error"></div>
                    <button type="submit" id="save-btn">Save Info</button>
                </form>
            </div>
        `;

        document.body.appendChild(this.formContainer);

        // Handle close button
        const closeBtn = document.getElementById('close-form-btn');
        closeBtn.addEventListener('click', () => {
            this.hideForm();
        });

        // Handle form submission
        const form = document.getElementById('user-form');
        const saveBtn = document.getElementById('save-btn');
        const errorDiv = document.getElementById('form-error');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const publicWallet = document.getElementById('publicWallet').value.trim();

            // Both fields are required
            if (!username || username.length === 0) {
                errorDiv.textContent = 'Username is required';
                errorDiv.style.display = 'block';
                return;
            }

            if (username.length > 50) {
                errorDiv.textContent = 'Username must be 50 characters or less';
                errorDiv.style.display = 'block';
                return;
            }

            if (!publicWallet || publicWallet.length === 0) {
                errorDiv.textContent = 'Public wallet is required';
                errorDiv.style.display = 'block';
                return;
            }

            if (publicWallet.length > 200) {
                errorDiv.textContent = 'Public wallet must be 200 characters or less';
                errorDiv.style.display = 'block';
                return;
            }

            // Disable button and show loading
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            errorDiv.style.display = 'none';

            try {
                await this.saveUserData(username, publicWallet);
                errorDiv.textContent = 'Info saved!';
                errorDiv.style.color = '#00ff00';
                errorDiv.style.borderColor = '#00ff00';
                errorDiv.style.display = 'block';
                setTimeout(() => {
                    errorDiv.style.display = 'none';
                }, 2000);
                
                // Notify chat manager of username update
                window.dispatchEvent(new CustomEvent('userDataUpdated', {
                    detail: { username: username, publicWallet: publicWallet }
                }));
                
                // Update user button text
                this.updateUserButton();
            } catch (error) {
                errorDiv.textContent = error.message || 'Failed to save. Please try again.';
                errorDiv.style.display = 'block';
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Info';
            }
        });

        // Pre-fill form if we have cached data
        if (this.userData) {
            const usernameInput = document.getElementById('username');
            const walletInput = document.getElementById('publicWallet');
            if (usernameInput) usernameInput.value = this.userData.username || '';
            if (walletInput) walletInput.value = this.userData.publicWallet || '';
        }
    }

    // Create and show join button at bottom of page
    showJoinButton() {
        // Create join button container
        this.joinButtonContainer = document.createElement('div');
        this.joinButtonContainer.id = 'join-button-container';
        
        // User icon button (SVG icon)
        const userIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
        
        // Eye icon button (SVG icon) - eye open and eye closed
        const eyeOpenIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
        const eyeClosedIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
        
        this.joinButtonContainer.innerHTML = `
            <div class="join-button-box">
                <button type="button" id="user-btn" class="user-button" title="${this.userData ? 'Change User' : 'Add User'}">${userIcon}</button>
                <button type="button" id="toggle-ui-btn" class="toggle-ui-button" title="${this.uiElementsVisible ? 'Hide UI Elements' : 'Show UI Elements'}">${this.uiElementsVisible ? eyeOpenIcon : eyeClosedIcon}</button>
                <button type="button" id="join-btn" class="join-button">Join Next Round</button>
            </div>
        `;

        document.body.appendChild(this.joinButtonContainer);

        // Handle user button (Add User / Change User)
        const userBtn = document.getElementById('user-btn');
        userBtn.addEventListener('click', () => {
            // Show form if it's hidden
            if (!this.formContainer || !this.formContainer.parentElement) {
                this.showForm();
            }
        });

        // Handle toggle UI button (Hide/Show UI elements)
        const toggleUiBtn = document.getElementById('toggle-ui-btn');
        toggleUiBtn.addEventListener('click', () => {
            this.toggleUIElements();
        });

        // Handle join button
        const joinBtn = document.getElementById('join-btn');
        joinBtn.addEventListener('click', () => {
            if (this.isJoined) {
                return; // Already joined
            }

            // Get user data from form or stored data
            let username = '';
            let publicWallet = '';

            if (this.formContainer) {
                const usernameInput = document.getElementById('username');
                const walletInput = document.getElementById('publicWallet');
                if (usernameInput) username = usernameInput.value.trim();
                if (walletInput) publicWallet = walletInput.value.trim();
            }

            // If form is closed, try to use stored data
            if ((!username || !publicWallet) && this.userData) {
                username = this.userData.username || '';
                publicWallet = this.userData.publicWallet || '';
            }

            // Both fields are required to join
            if (!username || !publicWallet) {
                // Show form if it's hidden
                if (!this.formContainer || !this.formContainer.parentElement) {
                    this.showForm();
                    // Wait a moment for form to render, then show error
                    setTimeout(() => {
                        const errorDiv = document.getElementById('form-error');
                        if (errorDiv) {
                            errorDiv.textContent = 'Please enter username and wallet address to join';
                            errorDiv.style.display = 'block';
                        }
                    }, 100);
                } else {
                    // Show error in existing form
                    const errorDiv = document.getElementById('form-error');
                    if (errorDiv) {
                        errorDiv.textContent = 'Please enter username and wallet address to join';
                        errorDiv.style.display = 'block';
                    }
                }
                return;
            }

            // Save user data before joining (non-blocking)
            this.saveUserData(username, publicWallet).catch(() => {
                // Ignore errors - allow join even if save fails
            });

            this.isJoined = true;
            joinBtn.disabled = true;
            joinBtn.textContent = 'Joined';
            
            // Hide form if visible
            this.hideForm();
            
            // Don't hide join button - keep it visible to show "Joined" status
            // Only hide when actually in game
            
            // Trigger custom event to join the queue
            window.dispatchEvent(new CustomEvent('joinGame', { 
                detail: { 
                    username: username, 
                    publicWallet: publicWallet 
                } 
            }));
        });
    }

    // Hide the join button container (when in game)
    hideJoinButton() {
        if (this.joinButtonContainer) {
            this.joinButtonContainer.style.display = 'none';
        }
    }

    // Show the join button container (when queue countdown is active)
    showJoinButtonContainer() {
        if (this.joinButtonContainer) {
            this.joinButtonContainer.style.display = 'block';
            // Only reset join button if player hasn't already joined
            // This preserves the "Joined" state if player clicked join while spectating
            if (!this.isJoined) {
                this.resetJoinButton();
            }
        }
    }

    // Reset join button to initial state
    resetJoinButton() {
        const joinBtn = document.getElementById('join-btn');
        if (joinBtn) {
            this.isJoined = false;
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Next Round';
        }
    }

    // Hide the form
    hideForm() {
        if (this.formContainer) {
            this.formContainer.style.opacity = '0';
            this.formContainer.style.transition = 'opacity 0.3s';
            setTimeout(() => {
                if (this.formContainer) {
                    this.formContainer.remove();
                    this.formContainer = null;
                }
            }, 300);
        }
    }

    // Update user button tooltip
    updateUserButton() {
        const userBtn = document.getElementById('user-btn');
        if (userBtn) {
            userBtn.title = this.userData ? 'Change User' : 'Add User';
        }
    }

    // Initialize - create join button but keep it hidden until queue starts
    async init() {
        // Try to load user data first (so we know if user exists)
        await this.loadUserData();
        
        // Create join button but keep it hidden (will be shown when queue countdown starts)
        this.showJoinButton();
        if (this.joinButtonContainer) {
            this.joinButtonContainer.style.display = 'none';
        }
        
        // Apply saved UI elements visibility state
        this.applyUIElementsVisibility();
        
        // Don't show form automatically - it will appear when user clicks buttons
    }

    // Get current user data
    getUserData() {
        return this.userData;
    }

    // Load UI elements visibility state from localStorage
    loadUIElementsVisibility() {
        const saved = localStorage.getItem('uiElementsVisible');
        return saved !== null ? saved === 'true' : true; // Default to visible
    }

    // Save UI elements visibility state to localStorage
    saveUIElementsVisibility(visible) {
        localStorage.setItem('uiElementsVisible', visible.toString());
    }

    // Toggle visibility of UI elements (token stats, leaderboard, how it works)
    toggleUIElements() {
        this.uiElementsVisible = !this.uiElementsVisible;
        this.saveUIElementsVisibility(this.uiElementsVisible);
        
        // Get UI elements
        const tokenStats = document.getElementById('token-stats');
        const leaderboard = document.getElementById('leaderboard');
        const howItWorks = document.getElementById('how-it-works');
        
        // Toggle visibility - use inline style to override CSS classes
        if (tokenStats) {
            if (this.uiElementsVisible) {
                tokenStats.style.display = ''; // Remove inline style to allow CSS to control
            } else {
                tokenStats.style.display = 'none'; // Force hide with inline style
            }
        }
        if (leaderboard) {
            if (this.uiElementsVisible) {
                leaderboard.style.display = ''; // Remove inline style to allow CSS to control
            } else {
                leaderboard.style.display = 'none'; // Force hide with inline style
            }
        }
        if (howItWorks) {
            if (this.uiElementsVisible) {
                howItWorks.style.display = ''; // Remove inline style to allow CSS to control
            } else {
                howItWorks.style.display = 'none'; // Force hide with inline style
            }
        }
        
        // Update button icon and title
        const toggleUiBtn = document.getElementById('toggle-ui-btn');
        if (toggleUiBtn) {
            const eyeOpenIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            const eyeClosedIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
            toggleUiBtn.innerHTML = this.uiElementsVisible ? eyeOpenIcon : eyeClosedIcon;
            toggleUiBtn.title = this.uiElementsVisible ? 'Hide UI Elements' : 'Show UI Elements';
        }
    }

    // Apply UI elements visibility on initialization
    applyUIElementsVisibility() {
        const tokenStats = document.getElementById('token-stats');
        const leaderboard = document.getElementById('leaderboard');
        const howItWorks = document.getElementById('how-it-works');
        
        if (!this.uiElementsVisible) {
            if (tokenStats) tokenStats.style.display = 'none';
            if (leaderboard) leaderboard.style.display = 'none';
            if (howItWorks) howItWorks.style.display = 'none';
        }
    }
}

// Initialize user form manager when DOM is ready
let userFormManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        userFormManager = new UserFormManager();
        window.userFormManager = userFormManager; // Make globally accessible
        userFormManager.init();
    });
} else {
    userFormManager = new UserFormManager();
    window.userFormManager = userFormManager; // Make globally accessible
    userFormManager.init();
}
