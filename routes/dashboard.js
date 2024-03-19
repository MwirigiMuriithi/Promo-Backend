const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const User = require('../models/userModel');
const Withdrawal = require('../models/withdrawalModel');
const Comment = require('../models/commentModel');

router.get('/userpoints', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        console.log('User data:', user);
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user points:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/leaderboard', requireAuth, async (req, res) => {
    try {
        const leaderboard = await User.find({}, 'username points')
            .sort({ points: -1 })
            .limit(10);

        res.status(200).json(leaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/withdraw', requireAuth, async (req, res) => {
    console.log('data:', req.body )
    const { username, points, timestamp } = req.body;

    
    try {
        if (points < 500) {
            return res.status(400).json({ error: 'Insufficient points to withdraw' });
        }

        const withdrawal = new Withdrawal({
            username,
            points,
            timestamp
        });

        await withdrawal.save();
        res.status(201).json({ message: 'Withdrawal request successful. It will be processed within 6 hours' });
    } catch (error) {
        console.error('Error processing withdrawal request:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/comments', requireAuth, async (req, res) => {
    const { body } = req.body;
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const comment = new Comment({
            userId: req.user._id,
            username: user.username,
            body
        });
        await comment.save();
        res.status(201).json({ message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to fetch comments
router.get('/comments', requireAuth, async (req, res) => {
    try {
        const comments = await Comment.find()
            .sort({ createdAt: 1 })
            .limit(20)
            .populate('userId', 'username'); // Populate the 'userId' field with the 'username' from the User model

        res.status(200).json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;