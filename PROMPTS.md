# Prompt Log

Use this file to record prompts and AI interactions during development.

## Entry Template

### Date / Feature: [Feature Name or Timestamp]
- **Prompt**: 
- **Purpose**: 
- **Result**: 
- **Lesson**: 

---

## Log Entries

*(Add new entries above this section or append chronologically)*

- You are working inside an existing starter template. Do NOT scaffold a new project.
- Inspect the existing codebase, especially AGENTS.md, docs/api.md, frontend/, and backend/. Identify the current entry points, dependencies, API contract, and missing pieces for "What Did I Miss?".
- Implement chat-log parsing in backend/src/services/chatParser.js and its tests in backend/src/services/chatParser.test.js. Support WhatsApp .txt (iOS/Android multi-line), CSV, and JSON exports; normalise sender, timestamp, message text, and @mentions. Handle malformed files without crashing.
- Create a synthetic conversation fixture in backend/src/fixtures/demoChat.json containing multiple senders, a direct @mention, an explicit decision, an assigned task, and a dated deadline.
- Implement the conversation-analysis API in backend/src/routes/analysis.js and connect it through the backend entry point. Create backend/src/services/localAnalysis.js accepting an optional userName field.
- Implement the chat-ingestion interface in frontend/src/components/ChatUploader.jsx and integrate it into frontend/src/App.jsx with a 'Your name' text field sent as userName.
- Implement the results dashboard in frontend/src/components/AnalysisDashboard.jsx with ranked priority feed, evidence-based reasons, and empty/error states. Integrate into App.jsx.
- Improve deterministic extraction in backend/src/services/localAnalysis.js: topic-based summary, evidence-backed decisions, tasks, dates, direct mentions, urgency, source message references, uncertain fields, and sensible empty results for irrelevant conversations. Detect user-assigned tasks and direct mentions with userName.
- Implement a privacy-status component in frontend/src/components/PrivacyIndicator.jsx and integrate it into frontend/src/App.jsx showing 'Processed locally — no data leaves your device'.
- Validate the complete app using the test setup and docs/api.md. Verify chatParser and localAnalysis tests, API routes, upload-to-dashboard flow, malformed uploads, and empty conversations.
- Polish the existing UI in frontend/src/App.jsx, frontend/src/components/ChatUploader.jsx, frontend/src/components/AnalysisDashboard.jsx, and frontend/src/components/PrivacyIndicator.jsx. Create a responsive productivity dashboard with clear visual hierarchy, readable task tables, and distinct urgency indicators.







