const { google } = require('googleapis');
const { Client } = require('pg');
require('dotenv').config();

class Indexer {
  constructor(serviceAccountJson) {
    this.jwtClient = new google.auth.JWT({
      email: serviceAccountJson.client_email,
      key: serviceAccountJson.private_key,
      scopes: ['https://www.googleapis.com/auth/indexing']
    });
  }

  async authorize() {
    return new Promise((resolve, reject) => {
      this.jwtClient.authorize((err, tokens) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(tokens);
      });
    });
  }

  async indexUrl(url, type = 'URL_UPDATED') {
    console.log(`[Indexer] Starting indexing for: ${url}`);
    const startTime = Date.now();
    try {
      console.log(`[Indexer] Authorizing...`);
      await this.jwtClient.authorize();
      console.log(`[Indexer] Authorization successful`);

      console.log(`[Indexer] Publishing to Google API...`);
      const response = await google.indexing('v3').urlNotifications.publish({
        auth: this.jwtClient,
        requestBody: {
          url: url,
          type: type,
        },
      });
      console.log(`[Indexer] Google API Success`);

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        url: url,
        type: type,
        response: response.data,
        durationMs: durationMs,
      };
    } catch (error) {
      console.error(`[Indexer] Error during indexing:`, error.message);
      const durationMs = Date.now() - startTime;
      let errorMessage = error.message;

      if (error.code === 403 || (error.response && error.response.status === 403)) {
        errorMessage = `Permission Denied: Please add "${this.jwtClient.email}" as an OWNER in Google Search Console for this domain.`;
      }

      return {
        success: false,
        url: url,
        type: type,
        error: errorMessage,
        durationMs: durationMs,
      };
    }
  }

  static async logIndexing(userId, result) {
    console.log(`[DB] Attempting to log result for: ${result.url}`);
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 5000, // 5 seconds timeout
    });
    try {
      await client.connect();
      console.log(`[DB] Connected`);
      const status = result.success ? 'SUCCESS' : 'FAILED';
      const apiResponse = result.success ? JSON.stringify(result.response) : JSON.stringify({ error: result.error });

      await client.query(
        `INSERT INTO indexing_logs (user_id, url, status, indexing_type, completion_time, duration_ms, api_response)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
        [userId, result.url, status, result.type, result.durationMs, apiResponse]
      );
      console.log(`[DB] Log inserted successfully`);
    } catch (err) {
      console.error('[DB] Error logging to database:', err.message);
    } finally {
      await client.end();
      console.log(`[DB] Connection closed`);
    }
  }
}

module.exports = Indexer;
