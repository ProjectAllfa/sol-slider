require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const ServerGameLoop = require('./server/ServerGameLoop');
const SocketHandler = require('./server/SocketHandler');
const RoundManager = require('./server/RoundManager');
const User = require('./models/user');
const AdminConfig = require('./models/adminConfig');
const TokenStats = require('./models/tokenStats');
const PlayerStats = require('./models/playerStats');
const session = require('express-session');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('./server/utils/encryption');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware for admin authentication
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Connect to MongoDB (with better error handling)
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.warn("[Server] MONGO_URI not found in environment variables - user data features will be disabled");
  } else {
    mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
    })
    .then(() => {
      console.log("[Server] ✅ Connected to MongoDB");
    })
    .catch((err) => {
      console.error("[Server] ❌ MongoDB connection error:", err.message);
      console.warn("[Server] Continuing without MongoDB - user data features will be disabled");
    });
  }
  
  // Helper to check connection before using DB features
  const isMongoConnected = () => mongoose.connection.readyState === 1;
  
  module.exports = { isMongoConnected };
// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve assets from public/assets
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Protect admin.html - redirect to login if not authenticated
app.get('/admin.html', (req, res, next) => {
    if (!req.session || !req.session.isAdmin) {
        return res.redirect('/admin-login.html');
    }
    next();
});

// API Routes for user management
// Get user by clientId
app.get('/api/user', async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { clientId } = req.query;
        if (!clientId) {
            return res.status(400).json({ error: 'clientId is required' });
        }
        
        const user = await User.findOne({ clientId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ username: user.username, publicWallet: user.publicWallet });
    } catch (error) {
        console.error('[Server] Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create or update user
app.post('/api/user', async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { clientId, username, publicWallet } = req.body;
        
        if (!clientId || !username || !publicWallet) {
            return res.status(400).json({ error: 'clientId, username, and publicWallet are required' });
        }
        
        // Validate inputs
        const trimmedUsername = username.trim();
        if (trimmedUsername.length === 0 || trimmedUsername.length > 50) {
            return res.status(400).json({ error: 'Username must be between 1 and 50 characters' });
        }
        
        if (publicWallet.trim().length === 0 || publicWallet.length > 200) {
            return res.status(400).json({ error: 'Public wallet must be between 1 and 200 characters' });
        }
        
        // Check if username is already taken by a different user
        const existingUserWithUsername = await User.findOne({ username: trimmedUsername });
        if (existingUserWithUsername && existingUserWithUsername.clientId !== clientId) {
            return res.status(409).json({ error: 'Username is already taken. Please choose a different username.' });
        }
        
        // Check if user already exists
        const existingUser = await User.findOne({ clientId });
        
        if (existingUser) {
            // Update existing user
            existingUser.username = trimmedUsername;
            existingUser.publicWallet = publicWallet.trim();
            // lastPlayed will be updated automatically by pre-save hook
            await existingUser.save();
            
            res.json({ 
                success: true,
                username: existingUser.username, 
                publicWallet: existingUser.publicWallet 
            });
        } else {
            // Create new user
            const user = new User({
                clientId,
                username: trimmedUsername,
                publicWallet: publicWallet.trim()
                // lastPlayed will be set automatically by pre-save hook
            });
            
            try {
                await user.save();
                res.json({ 
                    success: true,
                    username: user.username, 
                    publicWallet: user.publicWallet 
                });
            } catch (saveError) {
                // Handle duplicate username error (in case of race condition)
                if (saveError.code === 11000) {
                    return res.status(409).json({ error: 'Username is already taken. Please choose a different username.' });
                }
                throw saveError;
            }
        }
    } catch (error) {
        console.error('[Server] Error creating/updating user:', error);
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Username is already taken. Please choose a different username.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ===== ADMIN ROUTES =====

// Middleware to check if user is authenticated as admin
const requireAdmin = async (req, res, next) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    if (!req.session || !req.session.isAdmin) {
        return res.status(401).json({ error: 'Unauthorized - Admin access required' });
    }
    
    next();
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Get or create admin config
        let adminConfig = await AdminConfig.findOne();
        if (!adminConfig) {
            // Create default admin config
            adminConfig = new AdminConfig({
                adminUsername: 'admin',
                adminPassword: await bcrypt.hash('admin123', 10) // Default password, should be changed
            });
            await adminConfig.save();
        }
        
        // Check credentials
        const isUsernameValid = adminConfig.adminUsername === username;
        const isPasswordValid = await bcrypt.compare(password, adminConfig.adminPassword);
        
        if (!isUsernameValid || !isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Set session
        req.session.isAdmin = true;
        req.session.adminUsername = username;
        
        res.json({ success: true, message: 'Login successful' });
    } catch (error) {
        console.error('[Server] Error in admin login:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout' });
        }
        res.json({ success: true, message: 'Logout successful' });
    });
});

// Check if user is authenticated
app.get('/api/admin/check', requireAdmin, (req, res) => {
    res.json({ authenticated: true, username: req.session.adminUsername });
});

// Get admin configuration (without private keys)
app.get('/api/admin/config', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const adminConfig = await AdminConfig.findOne();
        if (!adminConfig) {
            return res.json({
                devWalletPublic: '',
                potWalletPublic: '',
                tokenContractAddress: '',
                tokenTicker: '$SLIDE'
            });
        }
        
        // Return config without private keys (they're encrypted in DB anyway)
        res.json({
            devWalletPublic: adminConfig.devWalletPublic || '',
            potWalletPublic: adminConfig.potWalletPublic || '',
            tokenContractAddress: adminConfig.tokenContractAddress || '',
            tokenTicker: adminConfig.tokenTicker || '$SLIDE',
            xLink: adminConfig.xLink || '',
            pumpfunLink: adminConfig.pumpfunLink || ''
        });
    } catch (error) {
        console.error('[Server] Error fetching admin config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update admin configuration
app.put('/api/admin/config', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const {
            devWalletPublic,
            devWalletPrivate,
            potWalletPublic,
            potWalletPrivate,
            tokenContractAddress,
            tokenTicker,
            xLink,
            pumpfunLink
        } = req.body;
        
        // Get or create admin config
        let adminConfig = await AdminConfig.findOne();
        if (!adminConfig) {
            adminConfig = new AdminConfig();
        }
        
        // Update public keys (always update if provided)
        if (devWalletPublic !== undefined) {
            adminConfig.devWalletPublic = devWalletPublic.trim();
        }
        if (potWalletPublic !== undefined) {
            adminConfig.potWalletPublic = potWalletPublic.trim();
        }
        
        // Update private keys (only if provided, and encrypt them)
        if (devWalletPrivate !== undefined && devWalletPrivate.trim() !== '') {
            // Encrypt private key before storing
            adminConfig.devWalletPrivate = encrypt(devWalletPrivate.trim());
        }
        
        if (potWalletPrivate !== undefined && potWalletPrivate.trim() !== '') {
            // Encrypt private key before storing
            adminConfig.potWalletPrivate = encrypt(potWalletPrivate.trim());
        }
        
        // Update token config
        if (tokenContractAddress !== undefined) {
            adminConfig.tokenContractAddress = tokenContractAddress.trim();
        }
        if (tokenTicker !== undefined) {
            adminConfig.tokenTicker = tokenTicker.trim() || '$SLIDE';
        }
        
        // Update social links
        if (xLink !== undefined) {
            adminConfig.xLink = xLink.trim();
        }
        if (pumpfunLink !== undefined) {
            adminConfig.pumpfunLink = pumpfunLink.trim();
        }
        
        await adminConfig.save();
        
        res.json({ success: true, message: 'Configuration updated successfully' });
    } catch (error) {
        console.error('[Server] Error updating admin config:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get decrypted private keys (admin only - for payment system use)
app.get('/api/admin/keys', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const adminConfig = await AdminConfig.findOne();
        if (!adminConfig) {
            return res.json({
                devWalletPrivate: '',
                potWalletPrivate: ''
            });
        }
        
        // Decrypt and return private keys
        res.json({
            devWalletPrivate: decrypt(adminConfig.devWalletPrivate || ''),
            potWalletPrivate: decrypt(adminConfig.potWalletPrivate || '')
        });
    } catch (error) {
        console.error('[Server] Error fetching decrypted keys:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get token statistics (admin only)
app.get('/api/admin/token-stats', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const stats = await TokenStats.getStats();
        res.json({
            totalBoughtTokens: stats.totalBoughtTokens || 0,
            totalBurnedTokens: stats.totalBurnedTokens || 0,
            totalSentTokens: stats.totalSentTokens || 0
        });
    } catch (error) {
        console.error('[Server] Error fetching token stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get token statistics (public - for players to see)
app.get('/api/token-stats', async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const stats = await TokenStats.getStats();
        const adminConfig = await AdminConfig.findOne();
        const tokenTicker = adminConfig?.tokenTicker || '$SLIDE';
        const tokenContractAddress = adminConfig?.tokenContractAddress || '';
        
        res.json({
            totalBoughtTokens: stats.totalBoughtTokens || 0,
            totalBurnedTokens: stats.totalBurnedTokens || 0,
            totalSentTokens: stats.totalSentTokens || 0,
            tokenTicker: tokenTicker,
            tokenContractAddress: tokenContractAddress,
            xLink: adminConfig?.xLink || '',
            pumpfunLink: adminConfig?.pumpfunLink || ''
        });
    } catch (error) {
        console.error('[Server] Error fetching public token stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get leaderboard (top 3 players by tokens won)
app.get('/api/leaderboard', async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const topPlayers = await PlayerStats.getTopPlayers(3);
        res.json(topPlayers || []);
    } catch (error) {
        console.error('[Server] Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset token statistics
app.post('/api/admin/token-stats/reset', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const stats = await TokenStats.resetStats();
        res.json({
            success: true,
            message: 'Token statistics reset successfully',
            stats: {
                totalBoughtTokens: stats.totalBoughtTokens,
                totalBurnedTokens: stats.totalBurnedTokens,
                totalSentTokens: stats.totalSentTokens
            }
        });
    } catch (error) {
        console.error('[Server] Error resetting token stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset leaderboard (delete all player stats)
app.post('/api/admin/leaderboard/reset', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const result = await PlayerStats.deleteMany({});
        res.json({
            success: true,
            message: 'Leaderboard reset successfully',
            deletedCount: result.deletedCount || 0
        });
    } catch (error) {
        console.error('[Server] Error resetting leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Initialize game loop
const gameLoop = new ServerGameLoop();
gameLoop.start();

// Initialize round manager (socketHandler will be set after it's created)
const roundManager = new RoundManager(gameLoop);

// Get game pause state
app.get('/api/admin/game-pause', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const adminConfig = await AdminConfig.findOne();
        res.json({
            gamePaused: adminConfig?.gamePaused || false
        });
    } catch (error) {
        console.error('[Server] Error fetching game pause state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set game pause state
app.post('/api/admin/game-pause', requireAdmin, async (req, res) => {
    if (!isMongoConnected()) {
        return res.status(503).json({ error: 'Database not available' });
    }
    
    try {
        const { gamePaused } = req.body;
        
        let adminConfig = await AdminConfig.findOne();
        if (!adminConfig) {
            adminConfig = new AdminConfig();
        }
        
        adminConfig.gamePaused = gamePaused === true;
        await adminConfig.save();
        
        // If pausing, stop the round manager
        if (adminConfig.gamePaused) {
            roundManager.stop();
            console.log('[Server] Game paused - round manager stopped');
        } else {
            // If resuming, reset for new token and start fresh
            roundManager.resetForNewToken();
            roundManager.start();
            console.log('[Server] Game resumed - round manager reset and started with new token');
        }
        
        res.json({
            success: true,
            gamePaused: adminConfig.gamePaused,
            message: adminConfig.gamePaused ? 'Game paused successfully' : 'Game resumed successfully'
        });
    } catch (error) {
        console.error('[Server] Error setting game pause state:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Set up round manager callbacks
roundManager.onQueueUpdate = (state) => {
    // Broadcast queue state to all clients
    io.emit('queue:update', state);
};

roundManager.onGameStart = (data) => {
    console.log(`[RoundManager] Game started - Round ${data.round}`);
    io.emit('game:start', data);
    
    // Spawn all queued players now that round has started
    if (data.queuedPlayerIds && data.queuedPlayerIds.length > 0) {
        socketHandler.spawnQueuedPlayers(data.queuedPlayerIds);
    }
};

roundManager.onGameUpdate = (state) => {
    // Broadcast game round state to all clients (different from game state updates)
    io.emit('round:game:update', state);
};

roundManager.onGameEnd = (data) => {
    console.log(`[RoundManager] Game ended - Round ${data.round}, Winners: ${data.winners.length}`);
    
    // Notify all clients that the game ended
    // Players will be removed cleanly after 5 second delay (no explosion effects for winners)
    io.emit('game:end', data);
};

roundManager.onRoundEnd = (data) => {
    console.log(`[RoundManager] Round ${data.round} ended`);
    io.emit('round:end', data);
};

// Start round manager (only if game is not paused)
(async () => {
    try {
        const adminConfig = await AdminConfig.findOne();
        if (!adminConfig || !adminConfig.gamePaused) {
            roundManager.start();
        } else {
            console.log('[Server] Game is paused - round manager not started');
        }
    } catch (error) {
        console.error('[Server] Error checking game pause state on startup:', error);
        // Start anyway if there's an error
        roundManager.start();
    }
})();

// Initialize socket handler (pass round manager)
const socketHandler = new SocketHandler(io, gameLoop, roundManager);
// Set socket handler reference in round manager
roundManager.socketHandler = socketHandler;

// Broadcast game state to all clients at regular intervals
// Higher update rate for smoother interpolation
setInterval(() => {
    socketHandler.broadcastGameState();
}, 1000 / 30); // 30 updates per second to clients (smoother)

// Broadcast round state every second
setInterval(async () => {
    const roundState = await roundManager.getState();
    io.emit('round:state', roundState);
}, 1000);

server.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
    console.log(`[Server] Socket.io initialized`);
    console.log(`[Server] Game loop active`);
});

