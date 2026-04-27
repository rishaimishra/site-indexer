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
    const startTime = Date.now();
    try {
      await this.authorize();

      const response = await google.indexing('v3').urlNotifications.publish({
        auth: this.jwtClient,
        requestBody: {
          url: url,
          type: type,
        },
      });

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        url: url,
        type: type,
        response: response.data,
        durationMs: durationMs,
      };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      let errorMessage = error.message;

      // Specially handling 403 errors for users
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
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    try {
      await client.connect();
      const status = result.success ? 'SUCCESS' : 'FAILED';
      const apiResponse = result.success ? JSON.stringify(result.response) : JSON.stringify({ error: result.error });

      await client.query(
        `INSERT INTO indexing_logs (user_id, url, status, indexing_type, completion_time, duration_ms, api_response)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)`,
        [userId, result.url, status, result.type, result.durationMs, apiResponse]
      );
    } catch (err) {
      console.error('Error logging to database:', err);
    } finally {
      await client.end();
    }
  }
}

module.exports = Indexer;
