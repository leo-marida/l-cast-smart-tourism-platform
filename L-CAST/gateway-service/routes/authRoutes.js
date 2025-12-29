const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB
});

router.post('/register', async (req, res) => {
    const { username, email, password, interest_vector } = req.body;
    // Hash password (Security Standard)
    const cleanEmail = email.trim().toLowerCase(); 
    
    const hash = await bcrypt.hash(password, 10);
    
    try {
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, interest_vector) VALUES ($1, $2, $3, $4) RETURNING id, role',
            [username, email, hash, JSON.stringify(interest_vector)]
        );
        res.status(201).json({ id: result.rows[0].id });
    } catch (err) {
        res.status(400).json({ error: 'User already exists' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // 1. Sanitize Input (Fixes the mobile keyboard space bug)
    const cleanEmail = email.trim().toLowerCase();
    
    console.log(`Login attempt for: '${cleanEmail}'`); // Debug Log

    try {
        // 2. Find User
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
        
        if (result.rows.length === 0) {
            console.log("User not found");
            return res.status(401).json({ error: 'Invalid User (Email not found)' });
        }
        
        const user = result.rows[0];
        
        // 3. Check Password
        const valid = await bcrypt.compare(password, user.password_hash);
        
        if (!valid) {
            console.log("Wrong password");
            return res.status(401).json({ error: 'Invalid Password' });
        }

        // 4. Generate Token
        const token = jwt.sign(
            { id: user.id, role: user.role, interests: user.interest_vector }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );
        
        res.json({ token, username: user.username, role: user.role });

    } catch (err) {
        console.error("Login System Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


module.exports = router;