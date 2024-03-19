// blogPosts.js

const express = require('express');
const router = express.Router();
const Blog = require('../models/blogModel');

// Route to fetch all blog posts
router.get('/posts', async (req, res) => {
    try {
        const blogPosts = await Blog.find();
        res.status(200).json(blogPosts);
    } catch (error) {
        console.error('Error fetching blog posts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Route to get a single blog post by ID
router.get('/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const blogPost = await Blog.findById(postId);
        if (blogPost) {
            res.json(blogPost);
        } else {
            res.status(404).json({ message: 'Blog post not found' });
        }
    } catch (error) {
        console.error('Error fetching blog post:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
module.exports = router;
