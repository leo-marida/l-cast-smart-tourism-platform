require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Database Configuration
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'database',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

app.use((req, res, next) => {
  req.pool = pool;
  next();
});

// 2. UPDATE HELMET TO ALLOW IMAGES
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allows the mobile app to see the images
  })
);

app.use(cors());
app.use(express.json());

// 3. SERVE THE UPLOADS FOLDER STATICALLY
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/api/pois', require('./routes/poiRoutes')); 
app.use('/api/social', require('./routes/socialRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));