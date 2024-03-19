const Payment = require('../models/payments');
const User = require('../models/userModel');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const statisticsSchema = new Schema({
    date: {
        type: Date,
        default: Date.now
    },
    users: {
        type: Number,
        default: 0
    },
    payments: {
        type: Number,
        default: 0
    },
    earnings: {
        type: Number,
        default: 0
    }
});

const Statistics = mongoose.model('Statistics', statisticsSchema);

// Function to calculate and store statistics
const calculateAndStoreStatistics = async () => {
    try {
        const currentDate = new Date();
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

        const usersCount = await User.countDocuments({ createdAt: { $lt: endOfDay } });
        const paymentsCount = await Payment.countDocuments({ timestamp: { $gte: startOfDay, $lt: endOfDay } });
        const payments = await Payment.find({ timestamp: { $gte: startOfDay, $lt: endOfDay } });
        const earningsGrowth = payments.reduce((total, payment) => total + (payment.amount - 100), 0);

        await Statistics.create({
            date: startOfDay,
            users: usersCount,
            payments: paymentsCount,
            earnings: earningsGrowth
        });
    } catch (error) {
        console.error('Error calculating and storing statistics:', error);
    }
};

// Schedule the function to run daily
setInterval(calculateAndStoreStatistics, 24 * 60 * 60 * 1000);

// Function to retrieve historical statistics
const getHistoricalStatistics = async () => {
    try {
        const statistics = await Statistics.find().sort({ date: 1 });
        return statistics;
    } catch (error) {
        console.error('Error fetching historical statistics:', error);
        return null;
    }
};

module.exports = {
    Statistics,
    getHistoricalStatistics
};
