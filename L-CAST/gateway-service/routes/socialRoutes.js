const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// GET FEED (Now identifies if YOU follow the author and if YOU liked the post)
router.get('/feed', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const query = `
            SELECT 
                p.id, 
                p.content, 
                p.created_at, 
                p.likes_count, 
                u.username, 
                u.id AS user_id,
                -- Check if the current user (myId) is following this post's author
                EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) AS is_following,
                -- Check if the current user (myId) has liked this post
                EXISTS (SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC 
            LIMIT 50
        `;
        const result = await pool.query(query, [myId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error("FEED ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// FOLLOW A USER
router.post('/user/:id/follow', auth, async (req, res) => {
    const targetUserId = req.params.id;
    const myId = req.user.id;
    
    if (myId == targetUserId) {
        return res.status(400).json({ error: "You cannot follow yourself" });
    }

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

// UNFOLLOW A USER (Fixed to use pool instead of req.pool)
router.delete('/user/:id/unfollow', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;

        await pool.query(
            'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
            [myId, targetUserId]
        );

        res.json({ success: true, message: 'Unfollowed' });
    } catch (err) {
        console.error("UNFOLLOW ERROR:", err.message);
        res.status(500).json({ error: "Database error during unfollow" });
    }
});

// GET LIST OF FOLLOWERS
router.get('/user/:id/followers', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username 
            FROM users u
            JOIN follows f ON u.id = f.follower_id
            WHERE f.following_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET LIST OF PEOPLE USER IS FOLLOWING
router.get('/user/:id/following', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username 
            FROM users u
            JOIN follows f ON u.id = f.following_id
            WHERE f.follower_id = $1
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET CURRENT USER LOGGED IN (Add to socialRoutes.js)
router.get('/user/me/profile', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
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
        
        if (profile.rows.length === 0) return res.status(404).json({ error: "User not found" });

        res.json({
            ...profile.rows[0],
            followersCount: parseInt(followers.rows[0].count),
            followingCount: parseInt(following.rows[0].count)
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
        const check = await pool.query('SELECT * FROM post_likes WHERE user_id=$1 AND post_id=$2', [userId, postId]);
        
        if (check.rows.length > 0) {
            await pool.query('DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2', [userId, postId]);
            await pool.query('UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id=$1', [postId]);
        } else {
            await pool.query('INSERT INTO post_likes (user_id, post_id) VALUES ($1, $2)', [userId, postId]);
            await pool.query('UPDATE posts SET likes_count = likes_count + 1 WHERE id=$1', [postId]);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;