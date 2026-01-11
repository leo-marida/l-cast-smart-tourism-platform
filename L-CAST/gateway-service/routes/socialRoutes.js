const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const multer = require('multer'); // Added for image handling
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// --- MULTER CONFIGURATION ---
// Ensure the uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Saves to the uploads folder
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp + original extension
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/feed', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        
        // 1. Fetch Posts with Follow, Like status, AND Comment Count
        const postsQuery = `
            SELECT 
                p.id, 
                p.content, 
                p.image_url, 
                p.created_at, 
                p.likes_count, 
                u.username, 
                u.id AS user_id,
                -- ADDED: Subquery to count comments for this specific post
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count,
                EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) AS is_following,
                EXISTS (SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC 
            LIMIT 50
        `;
        const postsResult = await pool.query(postsQuery, [myId]);
        const posts = postsResult.rows;

        // 2. Attach the 2 latest comments to each post
        const feedWithComments = await Promise.all(posts.map(async (post) => {
            const commentRes = await pool.query(`
                SELECT c.*, u.username 
                FROM post_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = $1
                ORDER BY c.created_at DESC
                LIMIT 2
            `, [post.id]);
            
            return { 
                ...post, 
                // Ensure comment_count is treated as a number (Postgres returns counts as strings)
                comment_count: parseInt(post.comment_count) || 0,
                latest_comments: commentRes.rows.reverse() 
            };
        }));

        res.json(feedWithComments);
    } catch (err) {
        console.error("FEED ERROR:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// CREATE POST (Modified to handle Multer upload)
router.post('/post', auth, upload.single('image'), async (req, res) => {
    const { content, poi_id } = req.body;
    const userId = req.user.id;
    
    // If a file was uploaded, store the relative path
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const result = await pool.query(
            'INSERT INTO posts (user_id, poi_id, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, poi_id || null, content, imageUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("POST ERROR:", err.message);
        res.status(500).json({ error: 'Failed to post' });
    }
});

// --- ALL OTHER ROUTES (FOLLOW, UNFOLLOW, PROFILE, LIKE) REMAIN THE SAME ---

// FOLLOW A USER
router.post('/user/:id/follow', auth, async (req, res) => {
    const targetUserId = req.params.id;
    const myId = req.user.id;
    if (myId == targetUserId) return res.status(400).json({ error: "You cannot follow yourself" });

    try {
        await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [myId, targetUserId]);
        res.json({ success: true, message: 'Followed' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/user/:id/unfollow', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, req.params.id]);
        res.json({ success: true, message: 'Unfollowed' });
    } catch (err) { res.status(500).json({ error: "Database error during unfollow" }); }
});

router.get('/user/:id/followers', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT u.id, u.username FROM users u JOIN follows f ON u.id = f.follower_id WHERE f.following_id = $1', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/following', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT u.id, u.username FROM users u JOIN follows f ON u.id = f.following_id WHERE f.follower_id = $1', [req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/me/profile', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/profile', auth, async (req, res) => {
    try {
        const userId = req.params.id;
        const profile = await pool.query('SELECT username, created_at FROM users WHERE id = $1', [userId]);
        const followers = await pool.query('SELECT COUNT(*) FROM follows WHERE following_id = $1', [userId]);
        const following = await pool.query('SELECT COUNT(*) FROM follows WHERE follower_id = $1', [userId]);
        if (profile.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json({ ...profile.rows[0], followersCount: parseInt(followers.rows[0].count), followingCount: parseInt(following.rows[0].count) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET COMMENTS FOR A SPECIFIC POST
router.get('/post/:id/comments', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.username 
            FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1
            ORDER BY c.created_at ASC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ADD A COMMENT
router.post('/post/:id/comment', auth, async (req, res) => {
    const { content } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [req.params.id, req.user.id, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to add comment" });
    }
});

module.exports = router;