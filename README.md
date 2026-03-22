# Eureka Super

Eureka Super is a local-first idea capture app designed for fast, low-friction capture and quick resurfacing.

## Who it is for
- People who need to capture ideas quickly before they disappear
- ADHD-minded workflows that need calm defaults and minimal friction
- Builders who prefer private, local-first tools

## Current features
- Capture-first default flow
- Optional title up to 40 characters (spaces allowed)
- Search and sort in Ideas view
- Optional Stats page (hidden by default)
- Help/onboarding page
- Encrypted-at-rest local idea vault
- Encrypted JSON export
- Optional PIN re-lock for private sessions
- Offline-first PWA support with service worker

## Local run
1. Open this folder in a terminal.
2. Start the local server:
   - `npm run dev`
3. Open `http://localhost:4173`.

## Project structure
- `index.html` app shell and pages
- `src/styles/app.css` UI styling
- `src/js/app.js` app orchestration and events
- `src/js/storage.js` encrypted local vault persistence
- `src/js/crypto.js` vault and export cryptography
- `src/js/export.js` encrypted export flow
- `scripts/dev-server.js` tiny local dev server
- `manifest.json` PWA metadata
- `service-worker.js` offline caching
- `assets/` icons and static assets
- `docs/agents/` role checklists for implementation, docs, compliance, and QA
- `docs/screenshots/` screenshot placeholders

## Screenshot placeholders
- `assets/screenshots/capture.png`
- `assets/screenshots/ideas.png`
- `assets/screenshots/settings.png`
- `docs/screenshots/capture-placeholder.svg`
- `docs/screenshots/ideas-placeholder.svg`
- `docs/screenshots/stats-placeholder.svg`

## Roadmap summary
- Now: stabilize merged capture + encrypted local vault + export
- Next: polish editing/session workflows and import
- Later: Resurface intelligence and scheduling

## Team workflow
- Major changes use a four-role workflow: implementation, docs steward, compliance, and QA/testing.
- Role checklists live in `docs/agents/`.
