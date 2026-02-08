const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// --- SECURITY MIDDLEWARE ---
const verifyAdmin = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: "Access Denied: No Token" });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        req.user = verified;

        // Double check role in DB to prevent token spoofing
        const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        
        if (userRes.rows.length === 0 || userRes.rows[0].role !== 'admin') {
            return res.status(403).json({ error: "Access Denied: Admins Only" });
        }
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid Token" });
    }
};

// --- AUTH ROUTE (Login for Admin) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(400).json({ error: "User not found" });

        const user = result.rows[0];

        // Verify Password
        const validPass = await bcrypt.compare(password, user.password_hash);
        if (!validPass) return res.status(400).json({ error: "Invalid password" });

        // Verify Role
        if (user.role !== 'admin') return res.status(403).json({ error: "Unauthorized access" });

        // Generate Token
        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '4h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- DASHBOARD STATS ---
router.get('/stats', verifyAdmin, async (req, res) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const poiCount = await pool.query('SELECT COUNT(*) FROM pois');
        const postCount = await pool.query('SELECT COUNT(*) FROM posts');
        const alerts = await pool.query("SELECT COUNT(*) FROM pois WHERE safety_status != 'Safe'");
        
        res.json({
            users: parseInt(userCount.rows[0].count),
            pois: parseInt(poiCount.rows[0].count),
            posts: parseInt(postCount.rows[0].count),
            alerts: parseInt(alerts.rows[0].count)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- USER MANAGEMENT ---
router.get('/users', verifyAdmin, async (req, res) => {
    try {
        // Get users and count their posts
        const result = await pool.query(`
            SELECT u.id, u.username, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) as post_count
            FROM users u ORDER BY u.created_at DESC LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CONTENT MODERATION (POSTS) ---
router.get('/posts', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.content, p.image_url, p.created_at, p.visibility,
            u.username, poi.name as location
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN pois poi ON p.poi_id = poi.id
            ORDER BY p.created_at DESC LIMIT 50
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/posts/:id', verifyAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM posts WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: "Post deleted by Admin" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete post" });
    }
});

// --- POI & SAFETY MANAGEMENT ---
router.get('/pois', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, region, safety_status, friction_index, category 
            FROM pois ORDER BY id ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/override-safety', verifyAdmin, async (req, res) => {
    const { poi_id, status } = req.body; 
    
    let friction = 1.0;
    if (status === 'Caution') friction = 0.5;
    if (status === 'Danger') friction = 0.0;

    try {
        await pool.query(
            'UPDATE pois SET safety_status = $1, friction_index = $2 WHERE id = $3', 
            [status, friction, poi_id]
        );
        res.json({ message: `POI ${poi_id} set to ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

// ==================================================
// --- LOCATION REQUESTS & NOTIFICATIONS (UPDATED) ---
// ==================================================

// 1. Get ALL requests (Pending, Approved, Rejected)
// Fixed: Removed "WHERE status='pending'" so frontend can show history tables
router.get('/requests', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, u.username 
            FROM location_requests r
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Handle Request Status (Accept/Reject + Notify)
// Fixed: Uses 'pool' instead of 'db', and 'verifyAdmin' instead of 'authenticateToken'
router.put('/requests/:id/status', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // Expecting 'approved' or 'rejected'
    const adminId = req.user.id; // <--- GET ADMIN ID

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    try {
        // A. Get request details
        const reqResult = await pool.query('SELECT * FROM location_requests WHERE id = $1', [id]);
        
        if (reqResult.rows.length === 0) return res.status(404).json({ error: "Request not found" });
        const request = reqResult.rows[0];

        // B. Update the Request Status (So it stays Green/Red in the list)
        await pool.query('UPDATE location_requests SET status = $1 WHERE id = $2', [status, id]);

        // C. Prepare Notification Text
        let notifMessage;
        if (status === 'approved') {
            notifMessage = `Your suggestion for "${request.name}" was ACCEPTED! We will add this location to the map soon.`;
            
            // OPTIONAL: Auto-insert into POIs if you want instant map updates
            // await pool.query("INSERT INTO pois (name, region, category, safety_status) VALUES ($1, $2, $3, 'Safe')", [request.name, request.region, request.category]);
        } else {
            notifMessage = `Regarding "${request.name}": We have reviewed your suggestion but cannot add it at this time. Thank you.`;
        }

        // D. Insert Notification
        await pool.query(
            'INSERT INTO notifications (recipient_id, type, message, is_read) VALUES ($1, $2, $3, FALSE)',
            [request.user_id, 'request_status', notifMessage]
        );

        res.json({ success: true, message: `Request ${status} and user notified.` });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// 3. Send Manual Notifications (Public or Specific)
router.post('/send-notification', verifyAdmin, async (req, res) => {
    const { user_id, title, message, type } = req.body;
    const adminId = req.user.id; // <--- GET ADMIN ID

    // Validate inputs
    if (!title || !message) return res.status(400).json({ error: "Title and message are required" });
    const fullMessage = `${title}: ${message}`; 

    try {
        if (type === 'all') {
            const usersResult = await pool.query('SELECT id FROM users');
            const users = usersResult.rows;

            // Send to all users
            for (const user of users) {
                await pool.query(
                    'INSERT INTO notifications (recipient_id, sender_id, type, message, is_read, post_id) VALUES ($1, $2, $3, $4, FALSE, NULL)',
                    [user.id, adminId, 'admin_alert', fullMessage]
                );
            }
            res.json({ success: true, message: `Sent to ${users.length} users.` });

        } else {
            // Send to specific user
            if (!user_id) return res.status(400).json({ error: "User ID required" });

            await pool.query(
                'INSERT INTO notifications (recipient_id, sender_id, type, message, is_read, post_id) VALUES ($1, $2, $3, $4, FALSE, NULL)',
                [user_id, adminId, 'admin_alert', fullMessage]
            );
            res.json({ success: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to send notification" });
    }
});

// 4. Delete Request Permanently (Trash Icon)
router.delete('/requests/:id', verifyAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM location_requests WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Delete failed" });
    }
});

module.exports = router;