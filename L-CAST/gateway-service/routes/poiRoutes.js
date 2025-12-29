const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});
const auth = require('../middleware/auth');

// DISCOVERY ENGINE (The Core Feature)
router.get('/discover', auth, async (req, res) => {
    const { lat, lon, radius = 20000 } = req.query;

    try {
        // 1. Fetch Candidates (PostGIS)
        const candidates = await pool.query(`
            SELECT id, name, description, region, image_url, base_popularity_score,
            ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
            FROM pois
            WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
        `, [lon, lat, radius]);

        // 2. Call Python Inference Service (Friction Index)
        try {
            const mlResponse = await axios.post('http://inference-service:8000/rank', {
                user_id: req.user.id,
                candidates: candidates.rows,
                current_weather: "Rainy", // In real app, fetch from OpenWeatherMap here
                traffic_status: "High"    // In real app, fetch from Google Traffic
            });
            res.json(mlResponse.data); // Returns re-ranked list with friction applied
        } catch (mlError) {
            console.error("ML Service Down, returning raw distance list (Graceful Degradation)");
            res.json(candidates.rows);
        }

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET ROUTE DETAILS (Google Maps Proxy to hide API Key)
router.get('/route', auth, async (req, res) => {
    const { originLat, originLon, destLat, destLon } = req.query;
    try {
        // Calls Google Directions API
        const googleRes = await axios.get(
            `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLon}&destination=${destLat},${destLon}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );
        res.json(googleRes.data);
    } catch (err) {
        res.status(500).json({ error: "Navigation Service Unavailable" });
    }
});

module.exports = router;