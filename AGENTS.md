# Eureka Super instructions

You are building a single production-ready Eureka app by merging the strongest parts of two prior versions:
- eureka1 = better capture-first UX, lower friction, simpler MVP flow
- eureka2 = better implemented improvements, including search, stats, stronger settings, and better title handling

## Product goal
Build one app that keeps eureka1's speed and simplicity while adding only the best parts of eureka2.

## Product rules
- Preserve the fastest, lowest-friction capture flow from eureka1.
- Add from eureka2 only where they improve actual usability:
  - search
  - 40-character titles with spaces allowed
  - optional stats page
  - help/onboarding
  - encrypted export
- Do not introduce extra UI clutter.
- Default experience must remain minimal, calm, and ADHD-friendly.
- Use progressive disclosure for advanced features.
- Keep the front experience focused on capturing and resurfacing ideas fast.

## Technical rules
- Refactor toward modular vanilla JavaScript.
- Keep the app offline-first.
- Preserve local-first storage and privacy.
- Do not add unnecessary frameworks.
- Favor simple files, readable code, and high-confidence changes.
- Prefer maintainability over cleverness.

## Repo and docs rules
- Keep docs synchronized with the actual code.
- If a feature changes, update docs in the same task.
- Create and maintain these files:
  - README.md
  - PRODUCT.md
  - ARCHITECTURE.md
  - ROADMAP.md
  - CHANGELOG.md
  - CONTRIBUTING.md
  - LICENSE
  - .gitignore

## README requirements
- Explain what Eureka is
- Explain who it is for
- List current features
- Explain local run instructions
- Show project structure
- Include screenshot placeholders
- Include roadmap summary

## PRODUCT requirements
- Positioning
- ADHD-friendly design principles
- Core user flows
- MVP vs future features
- Explain Resurface as a future flagship capability

## ARCHITECTURE requirements
- Folder structure
- State and storage approach
- Search logic overview
- Future Resurface logic overview
- Security and privacy notes

## ROADMAP requirements
- Now
- Next
- Later

## Build priorities
1. Keep fast capture flow
2. Add search
3. Increase title length to 40 and allow spaces
4. Add encrypted export
5. Add optional stats page
6. Add help/onboarding
7. Reduce duplicate code
8. Improve maintainability
9. Keep the UI simple by default

## Working style
- Make a merge plan before editing.
- Make small, reviewable changes.
- Before risky changes, tell me what you’re about to do.
- After each major task, summarize:
  - what changed
  - what files changed
  - how to test it
  - what remains
