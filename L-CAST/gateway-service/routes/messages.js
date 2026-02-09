const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Middleware to authenticate
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) { res.status(400).json({ error: 'Invalid token' }); }
};

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// 1. Search Users
router.get('/search', auth, async (req, res) => {
    const { q } = req.query;
    // Allow even 1 character searches
    if (!q || q.trim() === "") return res.json([]); 
    
    try {
        const result = await pool.query(
            `SELECT id, username, email FROM users 
             WHERE username ILIKE $1 AND id != $2 LIMIT 10`, 
            [`%${q}%`, req.user.id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// 2. Get Inbox (List of conversations)
router.get('/conversations', auth, async (req, res) => {
    try {
        // Complex query to get the last message per user
        const query = `
            SELECT DISTINCT ON (
                LEAST(sender_id, receiver_id), 
                GREATEST(sender_id, receiver_id)
            ) 
            m.id, m.content, m.created_at, m.sender_id, m.receiver_id, m.is_read,
            u.id as other_user_id, u.username as other_username
            FROM messages m
            JOIN users u ON (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END) = u.id
            WHERE m.sender_id = $1 OR m.receiver_id = $1
            ORDER BY 
                LEAST(sender_id, receiver_id), 
                GREATEST(sender_id, receiver_id), 
                m.created_at DESC
        `;
        const result = await pool.query(query, [req.user.id]);
        
        // Sort by latest message globally
        const sorted = result.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        res.json(sorted);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Get Chat History & Check Follow Status
router.get('/:userId', auth, async (req, res) => {
    const { userId } = req.params;
    try {
        const msgs = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_id = $1 AND receiver_id = $2) 
                OR (sender_id = $2 AND receiver_id = $1) 
             ORDER BY created_at ASC`,
            [req.user.id, userId]
        );

        // LOGIC FIX: Check if the *Other Person* follows *Me*
        // If they follow me, it is safe.
        const followCheck = await pool.query(
            `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
            [userId, req.user.id] // <--- Corrected Direction
        );

        // Also check if I follow THEM (Optional: makes it safe if connection is mutual)
        const myFollowCheck = await pool.query(
             `SELECT * FROM follows WHERE follower_id = $1 AND following_id = $2`,
            [req.user.id, userId]
        );

        // Logic: Safe if they follow me, OR I follow them, OR we have chat history
        const isSafe = 
            followCheck.rows.length > 0 || 
            myFollowCheck.rows.length > 0 ||
            msgs.rows.length > 0;

        res.json({
            messages: msgs.rows,
            isSafe: isSafe
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. UPDATED Send Message (With Socket.io Emit)
router.post('/:userId', auth, async (req, res) => {
    const { userId } = req.params;
    const { content } = req.body;

    if (!userId || userId === 'undefined') return res.status(400).json({ error: 'Invalid User ID' });
    try {
        const newMsg = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3) RETURNING *`,
            [req.user.id, userId, content]
        );

        const messageData = newMsg.rows[0];

        // EMIT TO WEBSOCKETS (Ensure req.io exists from server.js)
        if (req.io) {
            req.io.to(userId.toString()).emit('receive_message', messageData); // To them
            req.io.to(req.user.id.toString()).emit('receive_message', messageData); // To me (other devices)
        }

        // Notification (Wrap in try/catch so it doesn't block the message if it fails)
        try {
            await pool.query(
                `INSERT INTO notifications (recipient_id, sender_id, type, message, is_read) 
                 VALUES ($1, $2, 'comment', 'sent you a message.', FALSE)`, 
                [userId, req.user.id]
            );
        } catch (notifErr) { console.error("Notification failed", notifErr); }

        res.json(messageData);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. NEW: Mark conversation as read
router.put('/:userId/read', auth, async (req, res) => {
    const { userId } = req.params; // The other person
    const myId = req.user.id;

    try {
        await pool.query(
            `UPDATE messages 
             SET is_read = TRUE 
             WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
            [userId, myId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});


module.exports = router;