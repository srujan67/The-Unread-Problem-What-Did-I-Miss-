# ProtocolX — AI Development Log (`prompt.md`)

This document records the AI-assisted development process, architectural decisions, prompt logs, debugging steps, and testing verification for ProtocolX ("What Did I Miss?").

---

## 1. Project Overview

- **Problem**: In team messaging platforms and group chats (WhatsApp, Slack, exports), high message volume produces severe information overload. Critical decisions, assigned action items, approaching deadlines, and direct mentions get lost in unread message history.
- **Solution**: **ProtocolX ("What Did I Miss?")** is an offline-first conversation intelligence tool. It ingests chat exports across multiple formats, deterministically parses and clusters conversation events, personalizes what the user missed based on their identity, and optionally connects to Google Gemini AI while maintaining strict offline fallback guarantees.
- **Key Features**:
  - **Multi-Format Ingestion**: Supports WhatsApp `.txt` exports (both iOS and Android multi-line timestamps), CSV, and JSON chat logs.
  - **Deterministic Local Extraction**: 100% offline analysis identifying key topic summaries, explicit decisions, assigned tasks, dates/deadlines, direct @mentions, and urgency scores with message-level evidence.
  - **Personalized "What I Missed" Feed**: Filters and ranks items specifically targeting the current user with filter chips (*All*, *Urgent*, *For Me*) and expandable evidence quotes.
  - **Interactive 4-Card Overview Hub**: Clean navigation showing live counts for Summary, What I Missed, Tasks & Deadlines, and Decisions with client-side task mark-done checkboxes.
  - **Privacy Status Indicator**: Transparent banner disclosing whether processing is 100% local or transmitted to cloud AI.
  - **Optional Gemini AI Layer**: Deep semantic analysis powered by Google Gemini with strict 15-second timeout and automatic local fallback.
  - **"Ask Your Chat" Conversational Assistant**: Grounded Q&A chatbot backed by Gemini AI with suggested questions, verified source chips, and interactive message transcript highlighting.

---

## 2. Tech Stack & Architecture

- **Frontend**:
  - React 18 (Vite SPA)
  - Vanilla CSS design system (dark mode, card hub layout, responsive micro-animations)
  - Client-side state management for views, task completion, and conversation history
- **Backend**:
  - Node.js (v18+ runtime, ES modules)
  - Express.js REST API
  - In-memory cache for recent analysis sessions
- **AI & LLM Services**:
  - `@google/genai` official Node.js SDK
  - Gemini model configuration via `GEMINI_MODEL` (default: `gemini-2.5-flash`)
  - Strict JSON schema enforcement (`responseMimeType: "application/json"`)
  - 15-second `Promise.race` timeout wrapper with deterministic local fallback
- **Privacy & Security**:
  - Offline-first by default: zero cloud transmission unless user explicitly opts in
  - API keys read strictly from backend environment variables; never logged or exposed to the client
  - Chat text treated strictly as data, never as system instructions

---

## 3. AI Code Generation

The following prompts generated and refined application features and codebase structure.

### Entry 1: Starter Template Constraint
- **Prompt**: `You are working inside an existing starter template. Do NOT scaffold a new project.`
- **AI tool and model**: Not recorded
- **Purpose**: Initialize development context and enforce using existing repository structure rather than creating a new project.
- **Files affected**: None
- **Outcome**: Agent adhered to template structure and worked directly within existing repository files.
- **Verification status**: Verified

### Entry 2: Codebase Architecture Inspection
- **Prompt**: `Inspect the existing codebase, especially AGENTS.md, docs/api.md, frontend/, and backend/. Identify the current entry points, dependencies, API contract, and missing pieces for "What Did I Miss?".`
- **AI tool and model**: Not recorded
- **Purpose**: Audit existing starter files, verify dependencies, review API contract, and identify missing functionality.
- **Files affected**: None (read-only audit)
- **Outcome**: Mapped existing repository entry points, Express backend setup, Vite frontend setup, and requirements for chat parsing and analysis.
- **Verification status**: Verified

### Entry 3: Multi-Format Chat Log Parser
- **Prompt**: `Implement chat-log parsing in backend/src/services/chatParser.js and its tests in backend/src/services/chatParser.test.js. Support WhatsApp .txt (iOS/Android multi-line), CSV, and JSON exports; normalise sender, timestamp, message text, and @mentions. Handle malformed files without crashing.`
- **AI tool and model**: Not recorded
- **Purpose**: Implement multi-format chat ingestion service with automated test coverage.
- **Files affected**: `backend/src/services/chatParser.js`, `backend/src/services/chatParser.test.js`
- **Outcome**: Created robust parser supporting iOS bracket timestamps, Android hyphen timestamps, multi-line messages, CSV quotes, and JSON arrays, plus unit tests.
- **Verification status**: Verified

### Entry 4: Synthetic Conversation Fixture
- **Prompt**: `Create a synthetic conversation fixture in backend/src/fixtures/demoChat.json containing multiple senders, a direct @mention, an explicit decision, an assigned task, and a dated deadline.`
- **AI tool and model**: Not recorded
- **Purpose**: Provide reproducible test fixture and one-click sample dataset for manual testing and verification.
- **Files affected**: `backend/src/fixtures/demoChat.json`
- **Outcome**: Created demoChat.json containing 8 realistic team messages covering decisions, tasks, deadlines, and @mentions across 4 participants.
- **Verification status**: Verified

### Entry 5: Conversation Analysis API Route
- **Prompt**: `Implement the conversation-analysis API in backend/src/routes/analysis.js and connect it through the backend entry point. Create backend/src/services/localAnalysis.js accepting an optional userName field.`
- **AI tool and model**: Not recorded
- **Purpose**: Implement `POST /api/analyze` endpoint and deterministic extraction service supporting user personalization.
- **Files affected**: `backend/src/routes/analysis.js`, `backend/src/services/localAnalysis.js`, `backend/src/index.js`
- **Outcome**: Added REST route for conversation analysis and local rule-based extractor accepting `userName`.
- **Verification status**: Verified

### Entry 6: Ingestion Interface
- **Prompt**: `Implement the chat-ingestion interface in frontend/src/components/ChatUploader.jsx and integrate it into frontend/src/App.jsx with a 'Your name' text field sent as userName.`
- **AI tool and model**: Not recorded
- **Purpose**: Create frontend upload UI supporting drag-and-drop, text pasting, sample dataset loading, and user identity specification.
- **Files affected**: `frontend/src/components/ChatUploader.jsx`, `frontend/src/App.jsx`
- **Outcome**: Built ChatUploader component with file selection, drag-and-drop area, sample load button, and userName input.
- **Verification status**: Verified

### Entry 7: Results Dashboard Implementation
- **Prompt**: `Implement the results dashboard in frontend/src/components/AnalysisDashboard.jsx with ranked priority feed, evidence-based reasons, and empty/error states. Integrate into App.jsx.`
- **AI tool and model**: Not recorded
- **Purpose**: Build dashboard to visualize conversation summary, extracted decisions, action items, and participants.
- **Files affected**: `frontend/src/components/AnalysisDashboard.jsx`, `frontend/src/App.jsx`
- **Outcome**: Built initial dashboard component displaying summary metrics, action items, decisions, and priority highlights.
- **Verification status**: Verified

### Entry 8: Deterministic Extraction Heuristics
- **Prompt**: `Improve deterministic extraction in backend/src/services/localAnalysis.js: topic-based summary, evidence-backed decisions, tasks, dates, direct mentions, urgency, source message references, uncertain fields, and sensible empty results for irrelevant conversations. Detect user-assigned tasks and direct mentions with userName.`
- **AI tool and model**: Not recorded
- **Purpose**: Expand deterministic regex patterns for explicit decisions, deadlines, urgency markers, and personalized owner matching.
- **Files affected**: `backend/src/services/localAnalysis.js`
- **Outcome**: Added topic clustering, deadline regex, urgency keyword weighting, source message quotes, and user assignment matching.
- **Verification status**: Verified

---

## 4. Debugging

This section logs bugs, unexpected error states, diagnosis steps, and solutions.

### Entry D1: Missing NPM Test Script in Backend
- **Prompt**: Not recorded
- **AI tool and model**: Antigravity IDE (Gemini 3.8 Flash)
- **Purpose**: Diagnose why `npm test` failed in `backend/` with `npm error Missing script: "test"`.
- **Files affected**: `backend/package.json`
- **Outcome**: Identified that `backend/package.json` only defined `"start"` and `"dev"`. Verified that tests are executed directly using Node's built-in test runner via `node --test src/services/chatParser.test.js`.
- **Verification status**: Verified

### Entry D2: Gemini Model Deprecation / 404 Status Handling
- **Prompt**: Not recorded
- **AI tool and model**: Antigravity IDE (Claude Opus 4.6 / Gemini 3.8 Flash)
- **Purpose**: Handle runtime 404 error returned when upstream model `gemini-2.5-flash` was unavailable.
- **Files affected**: `backend/src/services/aiAnalysis.js`, `backend/src/services/chatService.js`
- **Outcome**: Added error handling catching HTTP 404, 429, 503, and timeouts to gracefully fall back to local analysis or local keyword search with an informative `fallbackReason`.
- **Verification status**: Verified

### Entry D3: Missing Message IDs for Chat Grounding
- **Prompt**: Not recorded
- **AI tool and model**: Antigravity IDE (Gemini 3.8 Flash)
- **Purpose**: Fix missing `id` property on parsed messages required by `POST /api/chat` source citation validation.
- **Files affected**: `backend/src/services/localAnalysis.js`, `backend/src/services/aiAnalysis.js`, `backend/src/services/chatService.js`, `frontend/src/components/AnalysisDashboard.jsx`
- **Outcome**: Added stable ID mapping (`msg-1`, `msg-2`, etc.) in analysis payloads and fallback source reconstruction in frontend.
- **Verification status**: Verified

---

## 5. AI Features & Design

Prompts governing AI integration, privacy disclosure, and dashboard UX architecture.

### Entry 9: Privacy Indicator Component
- **Prompt**: `Implement a privacy-status component in frontend/src/components/PrivacyIndicator.jsx and integrate it into frontend/src/App.jsx showing 'Processed locally — no data leaves your device'.`
- **AI tool and model**: Not recorded
- **Purpose**: Display a clear privacy status badge and disclosure about local on-device processing.
- **Files affected**: `frontend/src/components/PrivacyIndicator.jsx`, `frontend/src/App.jsx`
- **Outcome**: Created PrivacyIndicator component displaying shield badge and offline privacy disclosure in header.
- **Verification status**: Verified

### Entry 10: UI Polish and Responsive Layout
- **Prompt**: `Polish the existing UI in frontend/src/App.jsx, frontend/src/components/ChatUploader.jsx, frontend/src/components/AnalysisDashboard.jsx, and frontend/src/components/PrivacyIndicator.jsx. Create a responsive productivity dashboard with clear visual hierarchy, readable task tables, and distinct urgency indicators.`
- **AI tool and model**: Not recorded
- **Purpose**: Refine UI styling, typography, spacing, badge colors, and mobile responsiveness.
- **Files affected**: `frontend/src/App.jsx`, `frontend/src/components/ChatUploader.jsx`, `frontend/src/components/AnalysisDashboard.jsx`, `frontend/src/components/PrivacyIndicator.jsx`, `frontend/src/index.css`
- **Outcome**: Polished dashboard layout with cohesive dark theme, card containers, badge tags, and responsive CSS grid.
- **Verification status**: Verified

### Entry 11: 4-Card Overview Hub Redesign
- **Prompt**: `Redesign the results view in frontend/src/App.jsx and frontend/src/components/AnalysisDashboard.jsx with collapsed uploader compact bar, 4 selectable hub cards with live counts, isolated sub-views, user-focused 'What I Missed' with filter chips and evidence click-to-expand, and sortable tasks with mark-done checkboxes.`
- **AI tool and model**: Not recorded
- **Purpose**: Redesign results screen into a hub-and-spoke layout: collapsed uploader bar, 4 large overview cards (Summary, What I Missed, Tasks & Deadlines, Decisions), and isolated single-view navigation with back button.
- **Files affected**: `frontend/src/App.jsx`, `frontend/src/components/AnalysisDashboard.jsx`, `frontend/src/index.css`
- **Outcome**: Implemented card hub with live counts, isolated detail views with back button, user-focused What I Missed accordion, and sortable task list with completion checkboxes.
- **Verification status**: Verified

### Entry 12: Gemini AI Analysis Layer
- **Prompt**: `Add an optional Gemini AI analysis layer. Keep the existing local analysis working and don't change unrelated files.`
- **AI tool and model**: Antigravity IDE (Claude Opus 4.6)
- **Purpose**: Integrate `@google/genai` into backend for optional LLM-powered conversation analysis with strict 15s timeout, JSON schema output, and local fallback.
- **Files affected**: `backend/package.json`, `backend/.env.example`, `backend/src/services/aiAnalysis.js`, `backend/src/routes/analysis.js`, `frontend/src/api/client.js`, `frontend/src/components/ChatUploader.jsx`, `frontend/src/components/PrivacyIndicator.jsx`, `docs/api.md`
- **Outcome**: Added `POST /api/analyze-ai` endpoint, Google GenAI client, frontend consent toggle, updated privacy indicator for cloud AI disclosure, and API contract documentation.
- **Verification status**: Verified

### Entry 13: "Ask Your Chat" Conversational Assistant
- **Prompt**: `Add an "Ask your chat" chatbot panel backed by Gemini. Reuse the Gemini client/config from the /api/analyze-ai work (same .env key, same GEMINI_MODEL, same timeout/fallback approach). Don't change unrelated files. Never log or expose the API key.`
- **AI tool and model**: Antigravity IDE (Gemini 3.8 Flash / Claude Opus 4.6)
- **Purpose**: Build grounded conversational Q&A panel backed by Gemini AI with deterministic local keyword search fallback, source citation chips, and message highlighting.
- **Files affected**: `backend/src/services/chatService.js`, `backend/src/routes/analysis.js`, `backend/src/services/localAnalysis.js`, `backend/src/services/aiAnalysis.js`, `frontend/src/api/client.js`, `frontend/src/components/ChatPanel.jsx`, `frontend/src/components/AnalysisDashboard.jsx`, `frontend/src/index.css`, `docs/api.md`
- **Outcome**: Implemented `POST /api/chat`, local keyword search fallback, ChatPanel with suggested question chips, source ID validation, clickable source citation preview drawer, and transcript highlighter.
- **Verification status**: Verified

### Entry 15: Chatbot Panel Refinements & Layout Polish
- **Prompt**: `Small fixes to the chatbot panel only. Don't touch other files.
1. In the local keyword fallback, if no message scores above zero, answer "I couldn't find messages matching that" with no source chips. Don't return arbitrary messages.
2. When Cloud AI was on but the response fell back to local, change the badge from "Local" to "Local (Gemini unavailable)" and drop the lock icon for that case.
3. CSS: make the question input flex-grow to fill the row, and make the Send button fixed-width at the right.`
- **AI tool and model**: Antigravity IDE (Gemini 3.8 Flash)
- **Purpose**: Refine chatbot fallback handling for zero-score queries, update cloud fallback badge label and icon, and format input form layout.
- **Files affected**: `backend/src/services/chatService.js`, `frontend/src/components/ChatPanel.jsx`, `frontend/src/index.css`, `prompt.md`
- **Outcome**: `localKeywordSearch` returns "I couldn't find messages matching that" without arbitrary sources when no message scores above zero; badge displays "Local (Gemini unavailable)" without lock icon when falling back; input uses `flex-grow: 1` and Send button is fixed-width (105px).
- **Verification status**: Verified

---

## 6. Testing & Improvements

### Entry 14: End-to-End Validation
- **Prompt**: `Validate the complete app using the test setup and docs/api.md. Verify chatParser and localAnalysis tests, API routes, upload-to-dashboard flow, malformed uploads, and empty conversations.`
- **AI tool and model**: Not recorded
- **Purpose**: Validate end-to-end functionality, edge case handling, and conformance to `docs/api.md`.
- **Files affected**: None (validation pass)
- **Outcome**: Confirmed all parser unit tests passed, API routes conformed to specifications, and error handling gracefully caught malformed inputs.
- **Verification status**: Verified

---

## 7. Final Summary

- **AI Tools Used**:
  - Google Antigravity IDE
  - Gemini 3.8 Flash (Medium)
  - Claude Opus 4.6 (Thinking)
  - `@google/genai` Node.js SDK
- **Major Contributions**:
  1. Built multi-format chat log parser supporting WhatsApp (.txt iOS/Android), CSV, and JSON exports.
  2. Implemented 100% offline deterministic rule-based analysis engine extracting decisions, action items, deadlines, direct mentions, and urgency.
  3. Created responsive React dashboard with 4-card overview hub, interactive drill-downs, priority filters, and task management.
  4. Engineered optional Google Gemini AI analysis layer with 15s timeout protection and automatic fallback to local analysis.
  5. Implemented interactive "Ask Your Chat" chatbot panel with strict chat grounding, validated source chips, and transcript inspector.
  6. Provided transparent Privacy Indicator with clear disclosure of local vs cloud AI processing.
  7. Wrote comprehensive API contract documentation in `docs/api.md` and unit tests in `chatParser.test.js`.
- **Completed Features**:
  - Chat ingestion (file upload, text paste, sample dataset loader, identity personalization).
  - Deterministic offline conversation analysis.
  - Hub view with 4 live-count cards (Summary, What I Missed, Tasks & Deadlines, Decisions).
  - Personalized What I Missed feed with urgency filtering and expandable evidence quotes.
  - Sortable tasks table with interactive mark-done status checkboxes.
  - Privacy status indicator reflecting active processing mode (Local vs Gemini).
  - Optional Gemini AI analysis endpoint (`POST /api/analyze-ai`).
  - Conversational Q&A panel (`POST /api/chat`) with suggested questions and source message citations.
