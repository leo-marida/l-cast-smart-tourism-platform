-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    interest_vector JSONB, -- Stores [Adventure, Culture, Food, Nightlife]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Points of Interest (POIs) Table
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- e.g., 'Historical', 'Nature', 'Urban'
    region VARCHAR(50),   -- e.g., 'Mount Lebanon', 'Bekaa'
    location GEOGRAPHY(Point, 4326), -- Geospatial Point (Lat/Lon)
    image_url TEXT,
    base_popularity_score FLOAT DEFAULT 1.0
);

-- Indexing for high-performance geospatial queries (CLO3 Rigor)
CREATE INDEX poi_location_idx ON pois USING GIST (location);

CREATE TABLE itineraries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    poi_id INTEGER REFERENCES pois(id),
    visit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);