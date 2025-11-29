const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    roundNumber: {
        type: Number,
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        default: null
    },
    duration: {
        type: Number, // Duration in milliseconds
        default: null
    },
    status: {
        type: String,
        enum: ['queue', 'active', 'ended'],
        default: 'queue'
    },
    players: [{
        playerId: String,
        username: String,
        publicWallet: String,
        joinedAt: Date,
        eliminated: {
            type: Boolean,
            default: false
        },
        eliminatedAt: Date,
        isWinner: {
            type: Boolean,
            default: false
        }
    }],
    winners: [{
        playerId: String,
        username: String,
        publicWallet: String
    }],
    endReason: {
        type: String,
        enum: ['time', 'elimination', null],
        default: null
    }
}, {
    timestamps: true
});

// Index for querying active rounds
roundSchema.index({ status: 1, roundNumber: -1 });

const Round = mongoose.model('Round', roundSchema);

module.exports = Round;

