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
const storiesDir = 'uploads/stories/';

[uploadDir, storiesDir].forEach(dir => {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = req.path.includes('story') ? storiesDir : uploadDir;
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) return cb(null, true);
        cb(new Error('Only image files are allowed!'));
    }
});

// --- STORIES ---

router.get('/stories', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const query = `
            SELECT s.id, s.image_url, s.created_at, s.visibility, u.username, u.id as user_id
            FROM stories s
            JOIN users u ON s.user_id = u.id
            WHERE s.created_at > NOW() - INTERVAL '24 hours'
            AND (
                s.visibility = 'public' 
                OR s.user_id = $1 
                OR (s.visibility = 'followers' AND EXISTS (
                    SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = s.user_id
                ))
            )
            ORDER BY u.id, s.created_at ASC
        `;
        const result = await pool.query(query, [myId]);
        
        const grouped = result.rows.reduce((acc, story) => {
            const found = acc.find(item => item.user_id === story.user_id);
            if (found) { found.stories.push(story); } 
            else {
                acc.push({
                    user_id: story.user_id,
                    username: story.username,
                    stories: [story]
                });
            }
            return acc;
        }, []);

        res.json(grouped);
    } catch (err) {
        console.error('Stories fetch error:', err);
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});

router.post('/story', auth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No image provided" });
        
        const { visibility = 'public' } = req.body;
        const userId = req.user.id;
        const imageUrl = `/uploads/stories/${req.file.filename}`;

        const result = await pool.query(
            'INSERT INTO stories (user_id, image_url, visibility) VALUES ($1, $2, $3) RETURNING *',
            [userId, imageUrl, visibility]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Story creation error:', err);
        res.status(500).json({ error: "Failed to post story" });
    }
});

// --- FEED ---

router.get('/feed', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const postsQuery = `
            SELECT 
                p.id, p.content, p.image_url, p.created_at, p.likes_count, p.visibility,
                u.username, u.id AS user_id,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count,
                EXISTS (SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) AS is_following,
                EXISTS (SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE 
                p.visibility = 'public' 
                OR p.user_id = $1 
                OR (p.visibility = 'followers' AND EXISTS (
                    SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = p.user_id
                ))
            ORDER BY p.created_at DESC 
            LIMIT 50
        `;
        const postsResult = await pool.query(postsQuery, [myId]);
        const posts = postsResult.rows;

        const feedWithComments = await Promise.all(posts.map(async (post) => {
            const commentRes = await pool.query(`
                SELECT c.*, u.username FROM post_comments c
                JOIN users u ON c.user_id = u.id
                WHERE c.post_id = $1 ORDER BY c.created_at DESC LIMIT 2
            `, [post.id]);
            
            return { 
                ...post, 
                comment_count: parseInt(post.comment_count) || 0,
                latest_comments: commentRes.rows.reverse() 
            };
        }));

        res.json(feedWithComments);
    } catch (err) {
        console.error('Feed fetch error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- POSTS ---

router.post('/post', auth, upload.single('image'), async (req, res) => {
    const { content, poi_id, visibility = 'public' } = req.body;
    const userId = req.user.id;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    try {
        const result = await pool.query(
            'INSERT INTO posts (user_id, poi_id, content, image_url, visibility) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [userId, poi_id || null, content, imageUrl, visibility]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Post creation error:', err);
        res.status(500).json({ error: 'Failed to post' });
    }
});

router.put('/post/:id', auth, async (req, res) => {
    const { content, visibility } = req.body;
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
        if (post.rows.length === 0) return res.status(404).json({ error: "Post not found" });
        if (post.rows[0].user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        const updated = await pool.query(
            'UPDATE posts SET content = COALESCE($1, content), visibility = COALESCE($2, visibility) WHERE id = $3 RETURNING *',
            [content, visibility, postId]
        );
        res.json(updated.rows[0]);
    } catch (err) {
        console.error('Update post error:', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/post/:id', auth, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;

        const post = await pool.query('SELECT user_id, image_url FROM posts WHERE id = $1', [postId]);
        if (post.rows.length === 0) return res.status(404).json({ error: "Post not found" });
        if (post.rows[0].user_id !== userId) return res.status(403).json({ error: "Unauthorized" });

        if (post.rows[0].image_url) {
            const imagePath = path.join(__dirname, '..', post.rows[0].image_url);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        }

        await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
        res.json({ success: true, message: "Post deleted" });
    } catch (err) {
        console.error('Delete post error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- PROFILE & USER CONTENT ---

router.get('/user/me/profile', auth, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, bio FROM users WHERE id = $1', [req.user.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/me/update', auth, async (req, res) => {
    const { bio } = req.body;
    try {
        await pool.query('UPDATE users SET bio = $1 WHERE id = $2', [bio, req.user.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

router.get('/user/:id/profile', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;

        const query = `
            SELECT u.id, u.username, u.bio, u.created_at,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as "followersCount",
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as "followingCount",
                EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2) as "is_following"
            FROM users u WHERE u.id = $2
        `;
        const result = await pool.query(query, [myId, targetUserId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

        const profile = result.rows[0];
        res.json({
            ...profile,
            followersCount: parseInt(profile.followersCount),
            followingCount: parseInt(profile.followingCount)
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/posts', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const myId = req.user.id;
        
        const query = `
            SELECT p.*, u.username, u.id AS user_id,
                (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) AS comment_count,
                EXISTS (SELECT 1 FROM post_likes WHERE user_id = $1 AND post_id = p.id) AS is_liked
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.user_id = $2
            AND (
                p.visibility = 'public' 
                OR p.user_id = $1 
                OR (p.visibility = 'followers' AND EXISTS (
                    SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2
                ))
            )
            ORDER BY p.created_at DESC
        `;
        const result = await pool.query(query, [myId, targetUserId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/saved-places', auth, async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const query = `
            SELECT p.* FROM pois p
            JOIN itineraries i ON p.id = i.poi_id
            WHERE i.user_id = $1
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query, [targetUserId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Could not fetch saved places" }); }
});

// --- SOCIAL ACTIONS ---

router.post('/user/:id/follow', auth, async (req, res) => {
    const targetUserId = req.params.id;
    const myId = req.user.id;
    if (myId == targetUserId) return res.status(400).json({ error: "You cannot follow yourself" });

    try {
        await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [myId, targetUserId]);
        await pool.query('INSERT INTO notifications (recipient_id, sender_id, type) VALUES ($1, $2, $3)', [targetUserId, myId, 'follow']);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/user/:id/unfollow', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [req.user.id, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Database error" }); }
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

            const postInfo = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
            const recipientId = postInfo.rows[0].user_id;
            if (recipientId !== userId) {
                await pool.query('INSERT INTO notifications (recipient_id, sender_id, type, post_id) VALUES ($1, $2, $3, $4)', [recipientId, userId, 'like', postId]);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/post/:id/comment', auth, async (req, res) => {
    const { content } = req.body;
    const postId = req.params.id;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            'INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [postId, userId, content]
        );

        const postInfo = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);
        const recipientId = postInfo.rows[0].user_id;
        if (recipientId !== userId) {
            await pool.query('INSERT INTO notifications (recipient_id, sender_id, type, post_id) VALUES ($1, $2, $3, $4)', [recipientId, userId, 'comment', postId]);
        }
        res.status(201).json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Failed to add comment" }); }
});

router.get('/post/:id/comments', auth, async (req, res) => {
    try {
        const myId = req.user.id;
        const postId = req.params.id;

        // Security check for comments
        const visibilityCheck = await pool.query(`
            SELECT 1 FROM posts p WHERE p.id = $1 
            AND (p.visibility = 'public' OR p.user_id = $2 OR (p.visibility = 'followers' AND EXISTS (
                SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = p.user_id
            )))
        `, [postId, myId]);

        if (visibilityCheck.rows.length === 0) return res.status(403).json({ error: "Access denied" });

        const result = await pool.query(`
            SELECT c.*, u.username FROM post_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = $1 ORDER BY c.created_at ASC
        `, [postId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- NOTIFICATIONS & MISC ---

router.get('/notifications', auth, async (req, res) => {
    try {
        const query = `
            SELECT n.*, u.username as sender_name FROM notifications n
            JOIN users u ON n.sender_id = u.id
            WHERE n.recipient_id = $1 ORDER BY n.created_at DESC LIMIT 50
        `;
        const result = await pool.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/followers', auth, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) as is_following
            FROM users u JOIN follows f ON u.id = f.follower_id WHERE f.following_id = $2
        `;
        const result = await pool.query(query, [req.user.id, req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/user/:id/following', auth, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) as is_following
            FROM users u JOIN follows f ON u.id = f.following_id WHERE f.follower_id = $2
        `;
        const result = await pool.query(query, [req.user.id, req.params.id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/users/search', auth, async (req, res) => {
    const { query } = req.query; 
    const myId = req.user.id;

    if (!query) return res.json([]);

    try {
        // The $2 parameter will be "ha%"
        const result = await pool.query(`
            SELECT id, username, bio 
            FROM users 
            WHERE username ILIKE $2 AND id != $1
            ORDER BY username ASC
            LIMIT 8
        `, [myId, `${query}%`]); 

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Search failed" });
    }
});

module.exports = router;