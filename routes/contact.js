// contact.js

const express = require('express');
const router = express.Router();
const Message = require('../models/messageModel');
const requireAuth = require('../middleware/requireAuth');
const User = require('../models/userModel');
const PrivateMessage = require('../models/privateMessageModel');


// Route to add a new message
router.post('/messages', async (req, res) => {
    try {
        const { username, message } = req.body;
        
        // Create a new message
        const newMessage = new Message({
            username,
            message
        });

        // Save the message to the database
        await newMessage.save();

        res.status(201).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Route to fetch messages sent by admin
router.get('/admin-messages', requireAuth, async (req, res) => {
    try {
        // Find messages where the logged-in user is the recipient
        const messages = await PrivateMessage.find({ recipient: req.user._id });

        if (messages.length === 0) {
            // If there are no messages for the user, send a message saying so
            return res.status(200).json({ message: 'No messages found for the user' });
        }

        // If there are messages, send them back
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching admin messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


module.exports = router;
