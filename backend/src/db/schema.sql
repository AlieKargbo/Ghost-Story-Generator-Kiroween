-- Ghost Story Generator Database Schema

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  starting_prompt TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active'
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity_at);

-- Segments table
CREATE TABLE IF NOT EXISTS segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  contributor_id VARCHAR(255) NOT NULL,
  contributor_type VARCHAR(10) NOT NULL CHECK (contributor_type IN ('user', 'ai')),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mood_tags TEXT[]
);

CREATE INDEX IF NOT EXISTS idx_segments_session_timestamp ON segments(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_segments_session_id ON segments(session_id);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
