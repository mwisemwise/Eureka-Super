# Architecture

## Folder structure
- `index.html`: semantic page shell
- `src/styles/app.css`: visual system and layout
- `src/js/app.js`: state + rendering + event wiring
- `src/js/storage.js`: encrypted vault persistence, PIN mode migration, onboarding/settings
- `src/js/crypto.js`: vault key handling, PBKDF2, AES-GCM encryption/decryption
- `src/js/export.js`: encrypted export packaging
- `scripts/dev-server.js`: small local static server

## State and storage
- In-memory state object holds ideas, settings, filters, and active view
- Durable state is local-first:
  - encrypted idea vault in `localStorage` under `eureka.ideas.enc.v2`
  - settings in `localStorage` under `eureka.settings.v2`
  - PIN hash in `localStorage` under `eureka.pin.hash.v2`
  - default non-PIN vault key stored as a browser-held device key, with legacy install-secret migration for older vaults
- When PIN protection is enabled, the vault is re-encrypted with the PIN-derived key so ideas remain locked across sessions without extra cloud dependency

## Search logic
- Search query is normalized to lowercase
- Matching checks title + category + content substring containment
- Sort options: newest, oldest, title A-Z, title Z-A

## Future Resurface logic
Planned module will compute resurfacing scores from:
- age since last touch
- idea metadata/tag relevance
- recent user activity and focus themes

## Security and privacy notes
- App is local-first and offline-capable
- Stored ideas are encrypted at rest with AES-GCM
- Default local vault access now prefers a browser-held device key instead of a raw install secret stored beside the vault
- PIN mode re-encrypts the vault with a PIN-derived key using PBKDF2-SHA-256
- Export is always encrypted with a passphrase-derived AES-GCM key (PBKDF2)
- No remote sync by default
