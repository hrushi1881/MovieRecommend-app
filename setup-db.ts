import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from '@shared/schema';
import ws from 'ws';

// Set WebSocket implementation for Neon
neonConfig.webSocketConstructor = ws;

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// Run migrations
async function main() {
  console.log('Starting migration...');
  
  try {
    // Create or update tables
    await db.execute(`
      -- Add new columns to users table if they don't exist
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'experience_points') THEN
          ALTER TABLE users ADD COLUMN experience_points INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level') THEN
          ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'Beginner';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'watched_count') THEN
          ALTER TABLE users ADD COLUMN watched_count INTEGER DEFAULT 0;
        END IF;
      END $$;
    
      -- Create watched_movies table if it doesn't exist
      CREATE TABLE IF NOT EXISTS watched_movies (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        movie_id INTEGER NOT NULL,
        watched_at TIMESTAMP DEFAULT NOW()
      );

      -- Create user_movie_recommendations table if it doesn't exist
      CREATE TABLE IF NOT EXISTS user_movie_recommendations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        movie_id INTEGER NOT NULL,
        score DOUBLE PRECISION NOT NULL,
        genre_match DOUBLE PRECISION,
        language_match DOUBLE PRECISION,
        collaborative_score DOUBLE PRECISION,
        recommended BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create challenges table if it doesn't exist
      CREATE TABLE IF NOT EXISTS challenges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        required_level TEXT DEFAULT 'Beginner',
        required_movies JSONB DEFAULT '[]',
        required_genres JSONB DEFAULT '[]',
        required_count INTEGER DEFAULT 1,
        experience_reward INTEGER DEFAULT 20,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Create user_challenges table if it doesn't exist
      CREATE TABLE IF NOT EXISTS user_challenges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        challenge_id INTEGER NOT NULL,
        completed BOOLEAN DEFAULT false,
        progress INTEGER DEFAULT 0,
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);
    
    // Add some initial challenges
    await db.execute(`
      -- Only insert challenges if none exist
      INSERT INTO challenges (name, description, required_level, required_genres, experience_reward)
      SELECT 
        'Action Adventure', 
        'Watch 5 action or adventure movies to complete this challenge', 
        'Beginner',
        '[28, 12]'::jsonb,
        20
      WHERE NOT EXISTS (SELECT 1 FROM challenges LIMIT 1);
      
      INSERT INTO challenges (name, description, required_level, required_genres, experience_reward)
      SELECT 
        'Foreign Film Explorer', 
        'Watch 3 foreign language films to expand your horizons', 
        'Explorer',
        '[]'::jsonb,
        30
      WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE name = 'Foreign Film Explorer');
      
      INSERT INTO challenges (name, description, required_level, required_genres, experience_reward)
      SELECT 
        'Cinema Classics', 
        'Watch 3 films from before 1980', 
        'Cinephile',
        '[]'::jsonb,
        35
      WHERE NOT EXISTS (SELECT 1 FROM challenges WHERE name = 'Cinema Classics');
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main();