const mongoose = require('mongoose');

const adminConfigSchema = new mongoose.Schema({
    // Admin credentials
    adminUsername: {
        type: String,
        required: true,
        default: 'admin'
    },
    adminPassword: {
        type: String,
        required: true
        // Password will be hashed with bcrypt before saving
    },
    
    // Wallet configuration
    devWalletPublic: {
        type: String,
        default: ''
    },
    devWalletPrivate: {
        type: String,
        default: ''
        // Private key will be encrypted before storing (handled in routes)
    },
    
    potWalletPublic: {
        type: String,
        default: ''
    },
    potWalletPrivate: {
        type: String,
        default: ''
        // Private key will be encrypted before storing (handled in routes)
    },
    
    // Token configuration
    tokenContractAddress: {
        type: String,
        default: ''
    },
    tokenTicker: {
        type: String,
        default: '$SLIDE'
    },
    
    // Game control
    gamePaused: {
        type: Boolean,
        default: false
    },
    
    // Social links
    xLink: {
        type: String,
        default: ''
    },
    pumpfunLink: {
        type: String,
        default: ''
    },
    
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp before saving
adminConfigSchema.pre('save', async function() {
    this.updatedAt = new Date();
});

const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);

module.exports = AdminConfig;

