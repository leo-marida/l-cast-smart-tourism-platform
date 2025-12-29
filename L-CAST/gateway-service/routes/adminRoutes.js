const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

// Middleware: Check if user is Admin
// In a real app, you'd verify the JWT role here. 
// For this MVP, we will assume the request comes from the internal admin network or check a header.
const adminCheck = (req, res, next) => {
    // Simple toggle for MVP demo
    next(); 
};

// 1. Dashboard Stats
router.get('/stats', adminCheck, async (req, res) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const poiCount = await pool.query('SELECT COUNT(*) FROM pois');
        const frictionEvents = await pool.query("SELECT COUNT(*) FROM pois WHERE safety_status != 'Safe'");
        
        res.json({
            users: userCount.rows[0].count,
            pois: poiCount.rows[0].count,
            alerts: frictionEvents.rows[0].count
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get All POIs (Existing)
router.get('/pois', adminCheck, async (req, res) => {
    const result = await pool.query('SELECT id, name, region, safety_status FROM pois ORDER BY id ASC');
    res.json(result.rows);
});


// 3. NEW: See All Users (Feature Requirement)
router.get('/users', adminCheck, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. NEW: See All Posts (Feature Requirement)
router.get('/posts', adminCheck, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.id, p.content, p.likes_count, u.username, poi.name as location
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN pois poi ON p.poi_id = poi.id
            ORDER BY p.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Override Safety 
// Allows admin to manually mark a region as Dangerous (e.g., during a protest)
router.post('/override-safety', adminCheck, async (req, res) => {
    const { poi_id, status } = req.body; // status: 'Danger', 'Caution', 'Safe'
    
    try {
        await pool.query('UPDATE pois SET safety_status = $1 WHERE id = $2', [status, poi_id]);
        
        // Also update the Redis Cache if you implemented it, to notify the FrictionEngine immediately
        // client.set(`friction_override:${poi_id}`, status);
        
        res.json({ message: `POI ${poi_id} status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: "Update failed" });
    }
});

module.exports = router;