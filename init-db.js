const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function initDb() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexing logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS indexing_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        indexing_type TEXT NOT NULL, -- URL_UPDATED or URL_DELETED
        request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completion_time TIMESTAMP,
        duration_ms INTEGER,
        api_response TEXT
      )
    `);

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await client.end();
  }
}

initDb();
