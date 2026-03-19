# Architecture

## Folder structure
- `index.html`: semantic page shell
- `src/css/styles.css`: visual system and layout
- `src/js/constants.js`: shared constants
- `src/js/storage.js`: localStorage read/write
- `src/js/crypto.js`: AES-GCM export encryption
- `src/js/utils.js`: generic UI/file helpers
- `src/js/app.js`: state + rendering + event wiring

## State and storage
- In-memory state object holds ideas, settings, filters, and active view
- Durable state in localStorage:
  - ideas: `eurekaSuperIdeasV1`
  - settings: `eurekaSuperSettingsV1`

## Search logic
- Search query is normalized to lowercase
- Matching checks title + content substring containment
- Sort options: newest, oldest, title A-Z, title Z-A

## Future Resurface logic
Planned module will compute resurfacing scores from:
- age since last touch
- idea metadata/tag relevance
- recent user activity and focus themes

## Security and privacy notes
- App is local-first and offline-capable
- Export can be encrypted with passphrase-derived AES-GCM key (PBKDF2)
- No remote sync by default
