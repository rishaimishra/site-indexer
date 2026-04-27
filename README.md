# 🚀 Rapid Indexer

A high-speed Google URL indexing tool built with Node.js and the Google Indexing API.

## Features
- **Fast Indexing**: Requests are sent directly to Google's Indexing API.
- **Real-time Tracking**: Monitor indexing status and duration for every URL.
- **Dashboard**: Simple UI to submit URLs and view recent activities.
- **PostgreSQL Integration**: Persistent logs stored in your Neon database.

## Prerequisites
1. **Google Cloud Project**:
   - Enable the [Google Indexing API](https://console.cloud.google.com/apis/library/indexing.googleapis.com).
   - Create a **Service Account** and download the JSON key file.
   - Rename the key file to `service-account.json` and place it in the root of this project.
2. **Google Search Console**:
   - Add the Service Account email (found in the JSON file) as an **Owner** to the properties you want to index in Google Search Console.

## Setup & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Initialize the database:
   ```bash
   node init-db.js
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open your browser at `http://localhost:3000`.

## How it works
The tool uses the Google Indexing API `v3` to notify Google about updated or new URLs. This method is significantly faster than standard sitemap crawling and usually results in indexing within minutes or even seconds for verified properties.
