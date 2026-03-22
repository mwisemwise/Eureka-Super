# Agent Workflow

Eureka Super uses four explicit roles for non-trivial work:
- `implementation.md`
- `docs-steward.md`
- `compliance.md`
- `qa-testing.md`

## Why this exists
- Keep code ownership clear
- Keep docs current
- Measure shipped behavior against product rules
- Separate implementation from verification

## Default flow
1. Implementation agent changes code.
2. Docs steward updates repo docs to match shipped behavior.
3. Compliance agent checks code and docs against repo rules.
4. QA and testing agent verifies behavior and reports risk.

## Expected output from every role
- What was reviewed or changed
- Which files matter
- What is true now
- What still needs attention

## Stop conditions
- If code and docs disagree, the workflow is not complete.
- If testing was skipped, that must be stated explicitly.
- If a change adds UI or scope beyond the product rules, it must be challenged.
