-- Create declarations table
CREATE TABLE IF NOT EXISTS declarations (
    id UUID PRIMARY KEY,
    number VARCHAR(20) NOT NULL,
    date VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    recipient JSONB NOT NULL,
    equipment JSONB NOT NULL,
    sender JSONB NOT NULL,
    carrier JSONB NOT NULL,
    signature_sender TEXT,
    signature_carrier TEXT,
    request_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by number
CREATE INDEX IF NOT EXISTS idx_declarations_number ON declarations(number);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: To insert the initial admin user with hashed password (admin123):
-- INSERT INTO users (username, password, role) VALUES ('admin', '$2b$10$7R9rT9K1D1z5I1/S1u1G.Oz.E0U9/vC0Xg7j2S1i0p.Z1p.Z1p.Z1', 'master');
-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    action VARCHAR(20), -- 'CREATE', 'UPDATE', 'DELETE'
    entity VARCHAR(50), -- 'DECLARATION', 'USER'
    entity_id VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster log lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
