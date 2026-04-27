# Plan: Fix service account indexing error

The application was failing with "No key or keyFile set." because the `google.auth.JWT` constructor in `indexer.js` was using positional arguments that were either misinterpreted or incompatible with the version of `google-auth-library` being used. Switching to an options object resolved the issue in local testing.

## Proposed Changes

### Indexer
- Update `indexer.js` constructor to use an options object for `google.auth.JWT` initialization.
- (Optional but recommended) Ensure `private_key` handles literal `\n` strings correctly if they exist.

## Verification Plan

### Automated Tests
- Run `node test-auth.js` to ensure authorization still works.
- Create a new test `test-indexing.js` to attempt a real indexing request (will require the service account to have permission in Search Console for the specific URL).

### Manual Verification
- Restart the server: `node server.js`
- Use `curl` to trigger an indexing request:
  ```bash
  curl -X POST http://localhost:3000/api/index \
    -H "Content-Type: application/json" \
    -d '{"urls": ["https://srvtechnology.com/"]}'
  ```
- Check the logs in the UI or via `curl http://localhost:3000/api/logs`.
