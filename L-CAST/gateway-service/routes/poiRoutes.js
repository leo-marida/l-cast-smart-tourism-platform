const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');
const auth = require('../middleware/auth');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB
});

const getAIUrl = () => {
    return process.env.AI_SERVICE_URL || 'http://inference-service:8000';
};

// 1. DISCOVER 
router.get('/discover', auth, async (req, res) => {
    const { lat, lon, radius = 50000 } = req.query;

    try {
        // A. Fetch Candidates (Ensure image_url and distance_meters are selected)
        const candidates = await pool.query(`
            SELECT id, name, description, region, image_url, base_popularity_score,
            ST_X(location::geometry) as lon, 
            ST_Y(location::geometry) as lat,
            ST_Distance(location, ST_MakePoint($1, $2)::geography) as distance_meters
            FROM pois
            WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        `, [lon, lat, radius]);

        // B. Fetch Saved IDs
        const savedRes = await pool.query('SELECT poi_id FROM itineraries WHERE user_id = $1', [req.user.id]);
        const savedIds = new Set(savedRes.rows.map(r => r.poi_id));

        // C. Call Python Brain
        try {
            const mlResponse = await axios.post(`${getAIUrl()}/v1/recommend`, {
                user_id: req.user.id,
                user_interest_profile: "General", 
                candidates: candidates.rows 
            }, { timeout: 10000 }); // 10s timeout

            // D. Success: Merge "Saved Status"
            const finalResults = mlResponse.data.map(poi => ({
                ...poi,
                is_saved: savedIds.has(poi.id)
            }));

            res.json(finalResults);

        } catch (mlError) {
            console.error("⚠️ AI Service Failed (Using Fallback):", mlError.message); 
            
            // ✅ FIX: The Fallback MUST pass the image_url and distance through
            const fallback = candidates.rows.map(c => ({
                ...c, // This contains id, name, region, IMAGE_URL, DISTANCE
                is_saved: savedIds.has(c.id),
                friction_index: 1.0, 
                safety_factors: [{ icon: "⚠️", label: "Live Safety Offline" }]
            }));
            res.json(fallback);
        }

    } catch (err) {
        console.error("CRITICAL DATABASE ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. SAVE
router.post('/save', auth, async (req, res) => {
    const { poi_id } = req.body;
    if (!poi_id) return res.status(400).json({ error: "Missing POI ID" });

    try {
        await pool.query(
            'INSERT INTO itineraries (user_id, poi_id, visit_date) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, poi_id) DO NOTHING',
            [req.user.id, poi_id]
        );
        res.json({ message: "Saved" });
    } catch (err) {
        res.status(500).json({ error: "Save failed" });
    }
});

// 3. UNSAVE
router.post('/unsave', auth, async (req, res) => {
    const { poi_id } = req.body;
    try {
        await pool.query('DELETE FROM itineraries WHERE user_id = $1 AND poi_id = $2', [req.user.id, poi_id]);
        res.json({ message: "Unsaved" });
    } catch (err) {
        res.status(500).json({ error: "Unsave failed" });
    }
});

// 4. GET SAVED
router.get('/saved', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT p.id, p.name, p.region, p.image_url 
            FROM itineraries i 
            JOIN pois p ON i.poi_id = p.id 
            WHERE i.user_id = $1 
            ORDER BY p.id ASC
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Error fetching saved" });
    }
});

module.exports = router;