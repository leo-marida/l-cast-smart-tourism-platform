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

// Helper to determine AI Service URL
const getAIUrl = () => {
    // If running in Docker, use container name. If local, use localhost.
    return process.env.AI_SERVICE_URL || 'http://inference-service:8000';
};

// 1. DISCOVER (The Master Fix)
router.get('/discover', auth, async (req, res) => {
    const { lat, lon, radius = 50000 } = req.query;

    try {
        // A. Fetch Candidates from Database
        const candidates = await pool.query(`
            SELECT id, name, description, region, image_url, base_popularity_score,
            ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
            FROM pois
            WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        `, [lon, lat, radius]);

        // B. Fetch Saved IDs (Wishlist)
        const savedRes = await pool.query('SELECT poi_id FROM itineraries WHERE user_id = $1', [req.user.id]);
        const savedIds = new Set(savedRes.rows.map(r => r.poi_id));

        // C. Call Python Brain (Calculates Friction & Explanations)
        try {
            const mlResponse = await axios.post(`${getAIUrl()}/v1/recommend`, {
                user_id: req.user.id,
                user_interest_profile: "General", 
                candidates: candidates.rows // Send raw data to AI
            }, { timeout: 3000 }); // 3s timeout so app doesn't hang

            // D. Merge "Saved Status" into AI Results
            // The AI returns enriched data (friction_index, factors), we just need to add 'is_saved' back
            const finalResults = mlResponse.data.map(poi => ({
                ...poi,
                is_saved: savedIds.has(poi.id)
            }));

            res.json(finalResults);

        } catch (mlError) {
            console.error("⚠️ AI Service Error:", mlError.message); 
            // Fallback: If AI dies, return raw list but mark 'friction' as 1.0 (Safe) so app doesn't crash
            const fallback = candidates.rows.map(c => ({
                ...c,
                is_saved: savedIds.has(c.id),
                friction_index: 1.0, // Default safe
                safety_factors: [{ icon: "⚠️", label: "Live Safety Offline" }]
            }));
            res.json(fallback);
        }

    } catch (err) {
        console.error("CRITICAL DISCOVER ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// 2. SAVE
router.post('/save', auth, async (req, res) => {
    const { poi_id } = req.body;
    // Check if body was parsed
    if (!poi_id) {
        console.error("Save Error: Missing poi_id. Check express.json() middleware.");
        return res.status(400).json({ error: "Missing POI ID" });
    }

    try {
        await pool.query(
            'INSERT INTO itineraries (user_id, poi_id, visit_date) VALUES ($1, $2, NOW()) ON CONFLICT (user_id, poi_id) DO NOTHING',
            [req.user.id, poi_id]
        );
        res.json({ message: "Saved" });
    } catch (err) {
        console.error("SAVE FAILED (SQL Error):", err.message);
        // Specific help for the constraint error
        if (err.message.includes('ON CONFLICT')) {
            console.error("HINT: Run 'ALTER TABLE itineraries ADD CONSTRAINT unique_user_poi UNIQUE (user_id, poi_id);'");
        }
        res.status(500).json({ error: "Database error during save" });
    }
});

// 3. UNSAVE
router.post('/unsave', auth, async (req, res) => {
    const { poi_id } = req.body;
    try {
        await pool.query(
            'DELETE FROM itineraries WHERE user_id = $1 AND poi_id = $2',
            [req.user.id, poi_id]
        );
        res.json({ message: "Unsaved" });
    } catch (err) {
        console.error("UNSAVE ERROR:", err);
        res.status(500).json({ error: "Unsave failed" });
    }
});

// 4. GET SAVED
router.get('/saved', auth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT p.id, p.name, p.region, p.category 
            FROM itineraries i 
            JOIN pois p ON i.poi_id = p.id 
            WHERE i.user_id = $1 
            ORDER BY p.id ASC
        `, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error("GET SAVED ERROR:", err);
        res.status(500).json({ error: "Error fetching saved" });
    }
});

module.exports = router;