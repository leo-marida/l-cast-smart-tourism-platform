require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const { Pool } = require('pg');

// 1. IMPORT ROUTES
const socialRoutes = require('./routes/socialRoutes');
// const poiRoutes = require('./routes/poiRoutes'); // Uncomment this if you have a poiRoutes file
const adminRoutes = require('./routes/adminRoutes'); 
const app = express();

// 2. MIDDLEWARE
app.use(helmet());
app.use(cors());
app.use(express.json());

// 3. DATABASE CONFIG
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'database',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// 4. AUTH ROUTES (Register/Login)
app.post('/auth/register', async (req, res) => {
  const { username, email, password, interests } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, interest_vector) VALUES ($1, $2, $3, $4) RETURNING id',
      [username, email, hashedPassword, JSON.stringify(interests)]
    );
    res.status(201).json({ status: 'User Created', id: result.rows[0].id });
  } catch (err) {
    res.status(400).json({ error: 'Username/Email already exists' });
  }
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password_hash)) {
      const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid Credentials' });
    }
  } catch (err) { res.status(500).json({ error: "Login failed" }); }
});

// 5. ATTACH SOCIAL ROUTES
// We put this after pool is defined so the routes can use the pool
app.use('/api/social', socialRoutes);

// 6. DISCOVER ROUTE (Consolidated & Improved)
app.get('/api/discover', async (req, res) => {
  const { lat, lon, radius = 20000 } = req.query;
  try {
    // Stage 1: PostGIS Retrieval
    const poiQuery = await pool.query(`
      SELECT id, name, description, region, 
             ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
      FROM pois
      WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
    `, [lon || 35.5, lat || 33.8, radius]);

    const candidates = poiQuery.rows;

    // Stage 2: AI Ranking (Circuit Breaker Pattern)
    try {
        const inferenceResponse = await axios.post('http://inference-service:8000/v1/recommend', {
          user_prefs: "I enjoy historical sites", 
          poi_candidates: candidates
        }, {
          headers: { 'X-Internal-Key': process.env.INTERNAL_SERVICE_KEY },
          timeout: 2000
        });
        res.json(inferenceResponse.data);
    } catch (mlError) {
        console.warn("Inference Service Down - Using Fallback");
        res.json({ status: "fallback", data: candidates });
    }
  } catch (err) {
    res.status(500).json({ error: 'Pipeline Failure', details: err.message });
  }
});

// 7. START SERVER
app.listen(3000, () => console.log('L-CAST Secure Gateway Online'));