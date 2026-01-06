const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth'); // Check previous response for this file

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// GET FEED
// GET FEED (Now checks if YOU liked it)
router.get('/feed', auth, async (req, res) => {
    try {
        const query = `
            SELECT p.id, p.content, p.created_at, p.likes_count, u.username,
            EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC 
            LIMIT 50
        `;
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// FOLLOW A USER
router.post('/user/:id/follow', auth, async (req, res) => {
    const targetUserId = req.params.id;
    const myId = req.user.id;
    try {
        await pool.query(
            'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [myId, targetUserId]
        );
        res.json({ success: true, message: 'Followed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET USER PROFILE DATA (Counts)
router.get('/user/:id/profile', auth, async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await pool.query('SELECT username, created_at FROM users WHERE id = $1', [userId]);
        const followers = await pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [userId]);
        const following = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [userId]);
        
        res.json({
            ...profile.rows[0],
            followersCount: followers.rows[0].count,
            followingCount: following.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE POST
router.post('/post', auth, async (req, res) => {
    const { content, poi_id } = req.body;
    try {
        await pool.query(
            'INSERT INTO posts (user_id, poi_id, content) VALUES ($1, $2, $3)',
            [req.user.id, poi_id || null, content]
        );
        res.status(201).json({ message: 'Posted!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to post' });
    }
});

// LIKE POST
router.post('/post/:id/like', auth, async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    try {
        // Simple toggle logic (MVP)
        // 1. Check if liked
        const check = await pool.query('SELECT * FROM post_likes WHERE user_id=$1 AND post_id=$2', [userId, postId]);
        
        if (check.rows.length > 0) {
            // Unlike
            await pool.query('DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2', [userId, postId]);
            await pool.query('UPDATE posts SET likes_count = likes_count - 1 WHERE id=$1', [postId]);
        } else {
            // Like
            await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
            await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id=$1', [postId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;