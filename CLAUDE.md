# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Single-file web app (`index.html`) for a FIFA World Cup 2026 betting game (Tippspiel). No build step. Firebase Realtime Database for persistence. Deployed to GitHub Pages via GitHub Actions.

## Development

Open `index.html` directly in a browser. Firebase will fail to connect (placeholder credentials), but the UI renders and static logic works. To test with live data, temporarily insert real Firebase credentials locally — **never commit them**.

To trigger a deploy manually: push to `main`, or run the "Deploy to GitHub Pages" workflow from GitHub Actions.

To trigger a results update manually: run "WM Ergebnisse aktualisieren" from GitHub Actions.

## Architecture

Everything lives in `index.html`. The script section is structured as:

**Static match data** (compile-time constants):
- `GROUPS` — 12 groups (A–L), 4 teams each
- `MATCH_DATES` / `MATCH_TIMES` — keyed as `'Team1|Team2'` (both orderings checked at lookup)
- `MATCHES` — 72 group-stage matches, IDs 1–72, built from GROUPS × round-robin pairs
- `KO_MATCHES` — 32 KO matches, IDs 201–232 (R32 → R16 → QF → SF → 3P → F)

**Runtime state** (populated from Firebase):
- `tips` — `{ [playerName]: { [matchId]: { g1, g2 } } }`
- `results` — `{ [matchId]: { g1, g2 } }`
- `koTeams` — manually entered KO team names from admin page
- `autoKoTeams` — computed KO teams derived from group-stage results via `THIRD_PLACE_TABLE`

**Firebase path**: `/wm2026/{tips,results,koTeams}` — all read via a single `db.ref('wm2026').on('value', ...)` listener.

**Scoring** (`calcPts`): 3 pts exact result, 1 pt correct tendency (win/draw/loss), 0 pts wrong.

**KO team resolution** (`mTeam`): returns `autoKoTeams[id]?.[side] || koTeams[id]?.[side] || '???'`. Auto-teams are calculated once group results are complete using the `THIRD_PLACE_TABLE` lookup (maps combinations of 8 third-place groups to bracket slots).

**i18n**: Global `lang` variable (`'de'`/`'en'`). All UI strings via `t(key)` using the `T` constant (defined near the bottom of the script). Team names translated via `tn(name)` using `TEAM_EN`.

**Routing**: Single-page with `goTo(page)` showing/hiding `.page` divs and setting `.nav-btn.active`.

**Credentials in CI**: The `firebaseConfig` block in `index.html` contains `__PLACEHOLDER__` strings. The deploy workflow injects real values via `sed` from GitHub Secrets at deploy time.

## Critical duplication

`GROUPS` and `MATCH_DATES` are duplicated between `index.html` and `.github/scripts/update-results.js`. Any change to teams or fixture dates must be applied in **both files**.

## Auto-results script

`.github/scripts/update-results.js` (Node.js, no dependencies): fetches finished matches from `football-data.org` API (`/v4/competitions/WC/matches?season=2026`), maps English team names to German via `EN_TO_DE`, matches against the local `MATCHES` list, and PATCHes `/wm2026/results` in Firebase using the DB secret. Runs daily at 06:00 UTC via cron.

Required secrets: `FOOTBALL_API_KEY`, `FIREBASE_DATABASE_URL`, `FIREBASE_DB_SECRET`.

## Admin

Password hardcoded as `wm2026`. Admin page allows manually entering/overriding results and KO team names. All participants can see each other's tips on the "Alle Tipps" page without a password.
