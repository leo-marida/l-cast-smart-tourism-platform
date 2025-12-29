-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table (Enhanced Security)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
    interest_vector JSONB, -- [Adventure, Culture, Food, Nightlife]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. POIs (The Places)
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    region VARCHAR(50),
    location GEOGRAPHY(Point, 4326),
    image_url TEXT,
    base_popularity_score FLOAT DEFAULT 1.0,
    safety_status VARCHAR(20) DEFAULT 'Safe' -- 'Safe', 'Caution', 'Danger'
);
CREATE INDEX poi_location_idx ON pois USING GIST (location);

-- 3. Social Feed (Polyglot: Content here, Relationships in Neo4j)
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES pois(id), -- Optional: Tag a location
    content TEXT NOT NULL,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE post_likes (
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(id),
    PRIMARY KEY (user_id, post_id)
);

-- 4. Itineraries
CREATE TABLE itineraries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    poi_id INTEGER REFERENCES pois(id),
    visit_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seeding Admin (Default)
-- Password is 'admin123' (hashed)
INSERT INTO users (username, email, password_hash, role) 
VALUES ('SuperAdmin', 'admin@lcast.lb', '$2a$12$GwS.G6.y/W.t8/W.t8/W.t8/W.t8/W.t8/W.t8/W.t8', 'admin');