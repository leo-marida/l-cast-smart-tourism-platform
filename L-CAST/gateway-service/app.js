require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();
app.use(helmet());
app.use(express.json());

const cors = require('cors');
app.use(cors()); // Place this at the top of your app.js

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'database',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// --- CLO3: Security Standard (Authentication) ---
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
  const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password_hash)) {
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid Credentials' });
  }
});

// --- The Master Pipeline (Stage 1: Retrieval) ---
app.get('/api/discover', async (req, res) => {
  const { lat, lon, radius = 20000 } = req.query; // Default 20km

  try {
    // Stage 1: Geospatial Fetch using PostGIS (High Rigor)
    const poiQuery = await pool.query(`
      SELECT id, name, description, region, 
             ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
      FROM pois
      WHERE ST_DWithin(location, ST_MakePoint($1, $2)::geography, $3)
    `, [lon, lat, radius]);

    const candidates = poiQuery.rows;

    // Stage 2 & 3: Forward to Python Inference Service (Brain)
    const inferenceResponse = await axios.post('http://inference-service:8000/v1/recommend', {
      user_prefs: "I enjoy historical sites and coastal views", // Mock for now, would pull from user profile
      poi_candidates: candidates
    }, {
      headers: { 'X-Internal-Key': process.env.INTERNAL_SERVICE_KEY }
    });

    res.json(inferenceResponse.data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Circuit Breaker: Pipeline Failure', details: err.message });
  }
});

app.listen(3000, () => console.log('L-CAST Secure Gateway Online'));

// Endpoint for users to "Verify" safety at a location
app.post('/api/check-in', async (req, res) => {
  const { poiId } = req.body;
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Log the visit
    await client.query('INSERT INTO visits (user_id, poi_id) VALUES ($1, $2)', [req.user.id, poiId]);

    // 2. BOOST LONG TAIL: Increment base popularity by 0.05
    // This allows underserved regions to gain "algorithmic weight"
    await client.query('UPDATE pois SET base_popularity_score = base_popularity_score + 0.05 WHERE id = $1', [poiId]);

    await client.query('COMMIT');
    res.json({ success: true, message: "Community visibility updated!" });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).send("Error updating visibility");
  } finally {
    client.release();
  }
});

// Post a "Review/Update" for a POI
app.post('/api/posts', async (req, res) => {
  const { poi_id, content, rating } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO posts (user_id, poi_id, content, rating) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, poi_id, content, rating]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Post failed" });
  }
});

// Get Social Feed for a specific POI
app.get('/api/pois/:id/feed', async (req, res) => {
  const result = await pool.query(
    'SELECT posts.*, users.username FROM posts JOIN users ON posts.user_id = users.id WHERE poi_id = $1 ORDER BY created_at DESC',
    [req.params.id]
  );
  res.json(result.rows);
});