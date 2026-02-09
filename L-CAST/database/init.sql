-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user', 
    bio TEXT,
    interest_vector JSONB, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. POIs (The Places)
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

-- 3. POSTS TABLE
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES pois(id) ON DELETE SET NULL,
    content TEXT,
    image_url TEXT,
    likes_count INTEGER DEFAULT 0,
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. STORIES TABLE
CREATE TABLE IF NOT EXISTS stories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (follower_id, following_id)
);

-- 6. POST LIKES TABLE
CREATE TABLE IF NOT EXISTS post_likes (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
);

-- 7. POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS post_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'like', 'comment', 'follow'
    post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ITINERARIES (Saved Places)
CREATE TABLE IF NOT EXISTS itineraries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    poi_id INTEGER REFERENCES pois(id) ON DELETE CASCADE,
    visit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_poi UNIQUE (user_id, poi_id)
);

CREATE TABLE IF NOT EXISTS location_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Index for faster queries
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- 10. PATCH FOR EXISTING TABLES
ALTER TABLE posts ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN message TEXT;
ALTER TABLE notifications ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE notifications ALTER COLUMN post_id DROP NOT NULL;