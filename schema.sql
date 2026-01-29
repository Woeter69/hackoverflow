-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, -- Firebase UID
    username VARCHAR(50),
    email VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 5.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Travel Plans (Carpool/Commute)
CREATE TABLE IF NOT EXISTS travel_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT, -- Loose coupling or FK to users if we sync them
    origin_name TEXT,
    destination_name TEXT,
    origin_geom GEOGRAPHY(POINT, 4326),
    destination_geom GEOGRAPHY(POINT, 4326),
    -- The route can be simplified to a LineString for matching
    route_geom GEOGRAPHY(LINESTRING, 4326),
    mode VARCHAR(20), -- 'walk', 'cycle', 'car', 'cab'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    seats_available INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Errand Requests (Piggyback/Orders)
CREATE TABLE IF NOT EXISTS errand_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    pickup_geom GEOGRAPHY(POINT, 4326) NOT NULL,
    dropoff_geom GEOGRAPHY(POINT, 4326) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'matched', 'picked_up', 'delivered', 'cancelled'
    urgency_level INT DEFAULT 1,
    reward_estimate DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Emergency Beacons (Panic Button)
CREATE TABLE IF NOT EXISTS emergency_beacons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT,
    current_location GEOGRAPHY(POINT, 4326) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_travel_plans_route ON travel_plans USING GIST (route_geom);
CREATE INDEX IF NOT EXISTS idx_errand_requests_pickup ON errand_requests USING GIST (pickup_geom);
CREATE INDEX IF NOT EXISTS idx_emergency_beacons_location ON emergency_beacons USING GIST (current_location);
