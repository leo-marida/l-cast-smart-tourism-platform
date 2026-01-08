require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');

const app = express();

// Database Configuration (Moved from app.js)
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'database',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});

// Attach pool to req so routes can use it
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes - This uses the folders your teammate set up
app.use('/auth', require('./routes/authRoutes'));
app.use('/api/pois', require('./routes/poiRoutes')); 
app.use('/api/social', require('./routes/socialRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Gateway running on port ${PORT}`));