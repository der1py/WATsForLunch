# AGENTS.md

## Expo / React Native
- This is an Expo React Native app, not a web app.
- Use React Native / Expo components and APIs, not HTML/CSS.
- Do not introduce web-only libraries or browser APIs unless explicitly required.

## Architecture

- `app/` — Actual pages/components in TSX. Frontend only. Calls `services/` and nothing else.
- `data/` — Raw data only (JSON, etc.). Zero logic.
- `services/` — The single interface between `app/`, `domain/`, and `data/`. Fetches data and returns useful results (e.g. restaurants, ranked results). Connects data to everything else.
- `domain/` — Calculation/business logic. Organize by concern (e.g. `health/`, `distance/`, `ranking/`). Use separate folders when a concern needs multiple files (e.g. maps).

### Dependency Rules

`app → services → domain/data`

- `app` never calls `domain` or `data` directly.
- `domain` never calls `data` directly.
- `services` is responsible for connecting data and domain logic.

## Styling

- Clean, minimal, modern, and functional.
- No gradients, glow, excessive decoration, or bloated UI.
- Avoid rigid box/grid-heavy layouts; use spacing, hierarchy, and cards where appropriate.
- Define a small set of colours centrally; primarily black, white, green, and greys. Do not scatter hex codes throughout the codebase.