const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('pg');
const Indexer = require('./indexer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const pgConfig = {
  connectionString: process.env.DATABASE_URL,
};

// Helper to get service account from file for demo
const getServiceAccount = () => {
  const saPath = path.join(__dirname, 'service-account.json');
  if (fs.existsSync(saPath)) {
    return JSON.parse(fs.readFileSync(saPath, 'utf8'));
  }
  return null;
};

// Endpoint to submit URLs for indexing
app.post('/api/index', async (req, res) => {
  const { urls, userId = 1 } = req.body; // Default userId to 1 for now
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'Please provide an array of URLs' });
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) {
    return res.status(500).json({ error: 'Service account credentials missing. Place service-account.json in the root directory.' });
  }

  const indexer = new Indexer(serviceAccount);
  const results = [];

  for (const url of urls) {
    const result = await indexer.indexUrl(url);
    await Indexer.logIndexing(userId, result);
    results.push(result);
  }

  res.json({ results });
});

// Endpoint to fetch indexing logs
app.get('/api/logs', async (req, res) => {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    // Fetch logs from the past hour or all logs
    const result = await client.query(`
      SELECT l.*, u.username
      FROM indexing_logs l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.request_time DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
});

// Endpoint to get stats for "past hour" activities
app.get('/api/stats', async (req, res) => {
  const client = new Client(pgConfig);
  try {
    await client.connect();
    const result = await client.query(`
      SELECT
        COUNT(*) as total_indexed,
        AVG(duration_ms) as avg_duration
      FROM indexing_logs
      WHERE request_time > NOW() - INTERVAL '1 hour'
      AND status = 'SUCCESS'
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await client.end();
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
