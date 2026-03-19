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
- Plain or encrypted JSON export
- Offline-first PWA support with service worker

## Local run
1. Open this folder in a terminal.
2. Run a static server:
   - `python3 -m http.server 4173`
3. Open `http://localhost:4173`.

## Project structure
- `index.html` app shell and pages
- `src/css/styles.css` UI styling
- `src/js/app.js` app orchestration and events
- `src/js/storage.js` local persistence
- `src/js/crypto.js` encrypted export utilities
- `src/js/utils.js` helpers
- `manifest.json` PWA metadata
- `service-worker.js` offline caching
- `assets/` icons and static assets

## Screenshot placeholders
- `assets/screenshots/capture.png` (placeholder)
- `assets/screenshots/ideas.png` (placeholder)
- `assets/screenshots/settings.png` (placeholder)

## Roadmap summary
- Now: stabilize merged capture + search + export
- Next: polish editing/session workflows and import
- Later: Resurface intelligence and scheduling
