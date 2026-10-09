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

## Conversation Analysis

- **Endpoint**: `POST /api/analyze`
- **Description**: Ingests chat content (or raw JSON/text), parses messages, and returns structured deterministic analysis including summaries, decisions, action items, owner assignments, deadlines, mentions, urgency, relevance scores, and privacy disclosures. Accepts optional `userName`.
- **Request Body**:
  ```json
  {
    "chatLog": "[24/09/24, 10:15:30 AM] Alice: Hey @Bob...",
    "filename": "demoChat.json",
    "userName": "Bob"
  }
  ```
- **Response**:
  - `200 OK`
  ```json
  {
    "success": true,
    "analysis": {
      "summary": "High-level overview of conversation topics...",
      "topics": ["Architecture & Persistence", "Security & Authentication"],
      "format": "json",
      "totalMessages": 8,
      "participants": ["Alex Chen", "Jordan Miller", "Taylor Reed"],
      "decisions": [
        { "text": "We decided to use PostgreSQL...", "sender": "Taylor Reed", "timestamp": "..." }
      ],
      "actionItems": [
        { "task": "Complete the security audit", "owner": "Jordan", "deadline": "October 15, 2026", "text": "..." }
      ],
      "urgentHighlights": [
        { "type": "deadline", "description": "Finalize API spec by Oct 15", "urgency": "high" }
      ],
      "mentions": [
        { "mentionedUser": "Jordan", "sender": "Alex Chen", "text": "@Jordan to complete...", "isForUser": true }
      ],
      "userRelevanceScore": 100,
      "privacyNotice": "Processed locally. Zero chat data leaves your device or server."
    }
  }
  ```
  - `400 Bad Request`
  ```json
  {
    "success": false,
    "error": "Chat content is empty or invalid format."
  }
  ```

