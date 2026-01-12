const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const auth = require('../middleware/auth');
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// --- MULTER CONFIGURATION ---
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// --- FEED ROUTE ---
router.get('/feed', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const postsQuery = `
            SELECT 
                p.id, p.content, p.image_url, p.created_at, p.likes_count, 
                u.username, u.id AS user_id,
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
                comment_count: parseInt(post.comment_count) || 0,
                latest_comments: commentRes.rows.reverse() 
            };
        }));

        res.json(feedWithComments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CREATE POST ---
router.post('/post', auth, upload.single('image'), async (req, res) => {
    const { content, poi_id } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const result = await pool.query(
            'INSERT INTO posts (user_id, poi_id, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [userId, poi_id || null, content, imageUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to post' });
    }
});

// --- BIO / PROFILE UPDATES ---

// FIX: Added 'bio' to the SELECT statement
router.get('/user/me/profile', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, bio FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// FIX: Used 'auth' middleware and added 'bio' to return data
router.patch('/me/update', auth, async (req, res) => {
    const { bio } = req.body;
    const userId = req.user.id;
    
    try {
        await pool.query(
            'UPDATE users SET bio = $1 WHERE id = $2',
            [bio, userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

router.get('/user/:id/profile', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id; // The person logged in

        const query = `
            SELECT 
                u.id, 
                u.username, 
                u.bio, 
                u.created_at,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as "followersCount",
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as "followingCount",
                EXISTS(
                    SELECT 1 FROM follows 
                    WHERE follower_id = $1 AND following_id = $2
                ) as "is_following"
            FROM users u
            WHERE u.id = $2
        `;

        const result = await pool.query(query, [myId, targetUserId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const profile = result.rows[0];
        
        // Ensure counts are numbers (PG returns counts as strings)
        res.json({
            ...profile,
            followersCount: parseInt(profile.followersCount),
            followingCount: parseInt(profile.followingCount)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// --- FOLLOW WITH NOTIFICATION ---
router.post('/user/:id/follow', auth, async (req, res) => {
    const targetUserId = req.params.id;
    const myId = req.user.id;
    if (myId == targetUserId) return res.status(400).json({ error: "You cannot follow yourself" });

    try {
        await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [myId, targetUserId]);
        
        // Create Notification
        await pool.query(
            'INSERT INTO notifications (recipient_id, sender_id, type) VALUES ($1, $2, $3)',
            [targetUserId, myId, 'follow']
        );

        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LIKE WITH NOTIFICATION ---
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

            // Create Notification
            const postInfo = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
            const recipientId = postInfo.rows[0].user_id;

            if (recipientId !== userId) {
                await pool.query(
                    'INSERT INTO notifications (recipient_id, sender_id, type, post_id) VALUES ($1, $2, $3, $4)',
                    [recipientId, userId, 'like', postId]
                );
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- COMMENT WITH NOTIFICATION ---
router.post('/post/:id/comment', auth, async (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [postId, userId, content]
        );

        // Create Notification
        const postInfo = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
        const recipientId = postInfo.rows[0].user_id;

        if (recipientId !== userId) {
            await pool.query(
                'INSERT INTO notifications (recipient_id, sender_id, type, post_id) VALUES ($1, $2, $3, $4)',
                [recipientId, userId, 'comment', postId]
            );
        }

        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Failed to add comment" }); }
});

router.delete('/user/:id/unfollow', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Database error" }); }
});

router.get('/notifications', auth, async (req, res) => {
    try {
        const query = `
            SELECT n.*, u.username as sender_name
            FROM notifications n
            JOIN users u ON n.sender_id = u.id
            WHERE n.recipient_id = $1
            ORDER BY n.created_at DESC
            LIMIT 50
        `;
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/followers', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;

        const query = `
            SELECT 
                u.id, 
                u.username,
                EXISTS(
                    SELECT 1 FROM follows 
                    WHERE follower_id = $1 AND following_id = u.id
                ) as is_following
            FROM users u
            JOIN follows f ON u.id = f.follower_id 
            WHERE f.following_id = $2
        `;
        
        const result = await pool.query(query, [myId, targetUserId]);
        res.json(result.rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

router.get('/user/:id/following', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;

        const query = `
            SELECT 
                u.id, 
                u.username,
                EXISTS(
                    SELECT 1 FROM follows 
                    WHERE follower_id = $1 AND following_id = u.id
                ) as is_following
            FROM users u
            JOIN follows f ON u.id = f.following_id 
            WHERE f.follower_id = $2
        `;
        
        const result = await pool.query(query, [myId, targetUserId]);
        res.json(result.rows);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- GET SPECIFIC USER POSTS ---
router.get('/user/:id/posts', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;
        
        const query = `
            SELECT 
                p.id, p.content, p.image_url, p.created_at, p.likes_count, 
                u.username, u.id AS user_id,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count,
                EXISTS (SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = $2
            ORDER BY p.created_at DESC
        `;
        
        const result = await pool.query(query, [myId, targetUserId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GET USER'S SAVED PLACES (ITINERARIES) ---
router.get('/user/:id/saved-places', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;

        // Using the 'itineraries' table as the link between users and pois
        const query = `
            SELECT p.* FROM pois p
            JOIN itineraries i ON p.id = i.poi_id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
        `;
        
        const result = await pool.query(query, [targetUserId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Saved Places Query Error:", err.message);
        res.status(500).json({ error: "Could not fetch saved places" });
    }
});

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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;