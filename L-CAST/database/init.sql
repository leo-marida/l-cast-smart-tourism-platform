-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user', 
    interest_vector JSONB, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. POIs (The Places)
-- Merged fields from your previous init and seed files
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    region VARCHAR(255),
    
    -- Geospatial Column
    location GEOGRAPHY(Point, 4326),
    
    -- Metrics
    base_popularity_score FLOAT DEFAULT 0.5,
    friction_index FLOAT DEFAULT 1.0,  -- 1.0 = 100% Safe
    safety_status VARCHAR(20) DEFAULT 'Safe',
    
    -- Image URL (We keep this column to prevent backend errors, 
    -- but we will leave it empty since frontend uses local images)
    image_url TEXT
);

-- Create Spatial Index for fast "Near Me" queries
CREATE INDEX poi_location_idx ON pois USING GIST (location);

-- 3. Social Feed
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES pois(id),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    UNIQUE(user_id, poi_id)
);

-- 5. Seeding Admin
INSERT INTO users (username, email, password_hash, role) 
VALUES ('SuperAdmin', 'admin@lcast.lb', '$2a$12$GwS.G6.y/W.t8/W.t8/W.t8/W.t8/W.t8/W.t8/W.t8', 'admin');

-- 6. Follows Table (Social Graph)
CREATE TABLE follows (
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id),
    -- Prevent users from following themselves
    CONSTRAINT check_not_self_follow CHECK (follower_id <> following_id)
);