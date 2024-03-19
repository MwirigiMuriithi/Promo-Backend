const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    points: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

module.exports = Withdrawal;
