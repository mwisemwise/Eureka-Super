# Contributing

## Principles
- Preserve capture-first simplicity
- Keep advanced features progressively disclosed
- Prefer straightforward, readable vanilla JS

## Workflow
1. Create small, reviewable changes
2. Run work through the repo agent flow in `docs/agents/`
3. Keep docs in sync with code
4. Test locally with a static server
5. Submit clear change summary and test notes

## Quality checks
- App boots in browser from `http://localhost:4173`
- Capture, save, search, export work
- No regressions in offline behavior

## Agent flow
1. Implementation agent changes code
2. Docs steward updates the repo docs
3. Compliance agent checks code and docs against repo rules
4. QA and testing agent verifies behavior and reports risk
