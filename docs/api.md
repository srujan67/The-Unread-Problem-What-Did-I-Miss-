# API Contract

This document outlines the API endpoints and contracts for ProtocolX.

- **Base URL**: `http://localhost:5001` (Default Server Port: `5001`)

## Health Check

- **Endpoint**: `GET /health`
- **Description**: Returns the server health status.
- **Response**:
  - `200 OK`
  ```json
  {
    "status": "ok",
    "timestamp": "2026-10-04T21:45:00.000Z"
  }
  ```

- **Endpoint**: `GET /api/health`
- **Description**: Returns the server health status along with a boolean indicating whether `GEMINI_API_KEY` is set.
- **Response**:
  - `200 OK`
  ```json
  {
    "status": "ok",
    "geminiApiKeySet": true,
    "timestamp": "2026-10-08T23:14:00.000Z"
  }
  ```
