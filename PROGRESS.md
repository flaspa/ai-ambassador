## Completed work, blockers, next steps

### 2026-10-19: Cline environment setup

- Added `.gitignore`, a blank `.env.example`, and a local ignored `.env` for Parallel and optional direct Composio API access.
- Verified Git ignores `.env` and `.env.local` while allowing `.env.example`. No credentials were printed or committed.
- Confirmed `PARALLEL_API_KEY` and `COMPOSIO_API_KEY` were absent from process, user, and machine environment variables during setup.
- User has not yet completed the three Composio Google sign-ins or added the Parallel key. Authenticated integration calls remain unverified.
- Next: complete Google authorization through Cline's Composio integration; save the Parallel key locally; run read-only Composio checks and one Parallel `fast` search with the `.env` explicitly loaded.
- No application implementation or product/architecture selection was performed. Extra CLIs, SDKs, and Playwright remain deferred.

### 2026-10-19: Milestone 1 (landing page and real speaker data)

- Added `server.js` (Node built-ins only, no dependencies), `lib/` (`util`, `discover`, `enrich`) and `public/` (`index.html`, `styles.css`, `app.js`). Run with `node server.js`, then open http://localhost:3210 (or `/?auto=1` to load the speakers immediately). The default port is 3210; set `PORT` to change it.
- **Live:** speaker discovery reads the conference page (JSON-LD plus visible speaker cards). The MIT AI Conference 2026 page lists 73 speakers; all 73 loaded with title, organization, portrait and profile URL, and 27 have a LinkedIn link from the conference. The rest get a "Find on LinkedIn" search link.
- **Live:** Parallel Search (`/v1/search`, `fast` mode) enriched all 73 speakers with no failures in about 10 seconds. Result: 63 of 73 have a bio, 47 have topic tags, and all 73 have source links.
- **Heuristic:** bios use only sentences found in search results that describe the speaker. Topics come from a keyword dictionary. Some bios are cut at the sentence limit or left blank; nothing is invented.
- Not yet built: full gallery, match ranking, CRM, outreach, Composio Sheets and Gmail actions. Gmail and Sheets connections were active for the signed-in Google account but have not been tested by this app.
- The conference took place on October 17, 2026, so outreach will be written as post-event follow-up.
- No credentials were printed or written to any tracked file.

### 2026-10-19: Milestone 2 (gallery, match ranking, profiles)

- Added public/match.js (synonym-aware scoring in the browser, with quoted reasons), gallery.js (all 73 speakers, sort, filter, strong-and-good toggle), profile.js (profile drawer) and two CSS files. Re-ranking is instant when interests change.
- **Live:** Research again with Parallel in the profile drawer runs a real fast search for that speaker and refreshes sources in place. Gallery data is cached in `data/speakers.json`.
- **Heuristic:** scores are keyword and synonym matching, not an LLM. With the default interests the top 4 are Brad Porter, Felipe Chavez, James Cham and Kevin Peterson (75 each).
- Known gaps: topic tags come from a short keyword list, so some speakers have none; a few weak matches rank above better ones when their bios are thin.
