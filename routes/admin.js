const express = require('express');
const { loginAdmin, signupAdmin } = require('../controllers/adminController');
const Withdrawal = require('../models/withdrawalModel');
const Payment = require('../models/payments');
const User = require('../models/userModel');
const {Statistics} = require('../models/statisticsModel');
const Blog = require('../models/blogModel');
const Message = require('../models/messageModel');
const PrivateMessage = require('../models/privateMessageModel');
const Admin = require('../models/adminModel');

const requireAdminAuth = require('../middleware/adminMiddleware');

const router = express.Router();

// Admin login route
router.post('/login', loginAdmin);

// Admin signup route
router.post('/signup', signupAdmin);

// Protected admin dashboard route
//router.get('/dashboard', requireAdminAuth, (req, res) => {
    //res.status(200).json({ message: 'Admin dashboard accessed successfully' });
//});

// Get all withdrawal requests
router.get('/withdrawal-requests', requireAdminAuth, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().sort({ timestamp: 1 }); // Sorting by timestamp in ascending order
        res.status(200).json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawal requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete withdrawal request by ID
router.delete('/withdrawal-requests/:id', requireAdminAuth, async (req, res) => {
    const id = req.params.id;
    try {
        await Withdrawal.findByIdAndDelete(id);
        res.status(200).json({ message: 'Withdrawal request deleted successfully' });
    } catch (error) {
        console.error('Error deleting withdrawal request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all payments
router.get('/payments', requireAdminAuth, async (req, res) => {
    try {
        const payments = await Payment.find();
        res.status(200).json(payments);
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all users
router.get('/users', requireAdminAuth, async (req, res) => {
    try {
        const users = await User.find({}, 'username points phoneNumber referralCode').sort({ points: -1 }); // Sorting by points in descending order
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset user points by ID
router.post('/users/:id/reset-points', requireAdminAuth, async (req, res) => {
    const id = req.params.id;
    try {
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update the user's points to 0
        user.points = 0;

        // Update the user document in the database
        const updateResult = await User.updateOne({ _id: id }, { points: 0 });

        console.log('Update result:', updateResult);

        // Check if the update was successful
        if (updateResult.nModified === 1) {
            // Update the user object to reflect the changes
            user = await User.findById(id);
            console.log('Updated user:', user);
            console.log('Updated user points:', user.points);
            return res.status(200).json({ message: 'User points reset successfully', user });
        } else {
            console.error('Update operation not acknowledged:', updateResult);
            return res.status(500).json({ error: 'Failed to update user points' });
        }
    } catch (error) {
        console.error('Error resetting user points:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/blogs', requireAdminAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        const newBlog = new Blog({ title, content });
        await newBlog.save();
        res.status(201).json({ message: 'Blog saved successfully' });
    } catch (error) {
        console.error('Error saving blog:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to fetch all messages
router.get('/messages', requireAdminAuth, async (req, res) => {
    try {
        // Fetch all messages from the database
        const messages = await Message.find();

        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to send a private message
router.post('/sendmessage', requireAdminAuth, async (req, res) => {
    try {
        const { username, message } = req.body;
        
        // Find the recipient based on their username
        const recipient = await User.findOne({ username });
        if (!recipient) {
            return res.status(404).json({ error: 'Recipient not found' });
        }

        const sender = await Admin.findById(req.admin._id);

        const newMessage = new PrivateMessage({
            sender: sender._id,
            recipient: recipient._id,
            message
        });

        await newMessage.save();

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to fetch daily statistics
router.get('/daily-statistics', requireAdminAuth, async (req, res) => {
    try {
        // Get current date
        const currentDate = new Date();
        const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);

        // Calculate new users (users created today)
        const newUsersCount = await User.countDocuments({ createdAt: { $gte: startOfDay, $lt: endOfDay }, isNew: true });

        // Calculate payment growth
        const paymentsCount = await Payment.countDocuments({ timestamp: { $gte: startOfDay, $lt: endOfDay } });

        // Calculate earnings growth (assuming 'amount' field represents earnings)
        const payments = await Payment.find({ timestamp: { $gte: startOfDay, $lt: endOfDay } });
        const earningsGrowth = payments.reduce((total, payment) => total + (payment.amount - 100), 0);

        // Send daily statistics as JSON response
        res.json({
            usersGrowth: newUsersCount, // Update to newUsersCount
            paymentsGrowth: paymentsCount,
            earningsGrowth: earningsGrowth
        });
    } catch (error) {
        console.error('Error fetching daily statistics:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to fetch growth statistics
router.get('/growth', requireAdminAuth, async (req, res) => {
    try {
        // Fetch historical statistics
        const historicalStatistics = await Statistics.find().sort({ date: 1 });

        // Calculate growth over time
        const usersGrowth = calculateGrowth(historicalStatistics, 'users');
        const paymentsGrowth = calculateGrowth(historicalStatistics, 'payments');
        const earningsGrowth = calculateGrowth(historicalStatistics, 'earnings');

        // Return growth statistics as JSON response
        res.json({
            usersGrowth,
            paymentsGrowth,
            earningsGrowth
        });
    } catch (error) {
        console.error('Error fetching growth statistics:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Helper function to calculate growth over time
const calculateGrowth = (historicalStatistics, field) => {
    return historicalStatistics.map(statistic => ({ date: statistic.date, value: statistic[field] }));
};

// Export the router
module.exports = router;