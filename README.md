# AI Ambassador

AI Ambassador is a personal AI agent for conference networking. Paste a conference URL, describe your interests, and it reads the speaker list, researches each person on the live web, ranks them by how well they match you, and (in progress) helps you add them to a CRM and reach out. It was built for the Cline × Composio × Parallel hackathon on October 19, 2026.

## Features

**Working now**

- **Speaker discovery from any conference URL.** Reads schema.org `Person` data and visible speaker cards; falls back to a Parallel search when a site has neither. Tested on the MIT AI Conference 2026 (73 speakers, with portraits and LinkedIn links where the conference lists them).
- **Live research with Parallel.** Each speaker gets a short biography, topic tags and source links from Parallel's Search API (`fast` mode). Bios use only sentences found in search results; a missing bio stays blank.
- **Match ranking.** Synonym-aware keyword scoring runs in the browser and re-ranks instantly when you change your interests. Every score shows quoted reasons from the speaker's own data. This is a heuristic, not an LLM.
- **Speaker gallery and profiles.** Sort, filter, a "strong and good matches only" toggle, and a profile drawer with sources and a "Research again with Parallel" button.

- **Email finder.** "Find email with Parallel" searches the web for a published work email and shows the source link and evidence. An address is accepted only when it matches the speaker's company. Addresses are never guessed, and many speakers will return "not found".
- **Gmail drafts through Composio.** An editable message template (your interests, the speaker's role, a matched reason) becomes a draft in your Gmail. The app has no send function; nothing is ever sent automatically.
- **Link checks.** Profile and source links that return 404 or 410, or point to a host that does not exist, are removed after each research run. LinkedIn and sites that block bots cannot be verified automatically and are kept.

**In progress (not built yet)**

- Selecting speakers and saving them to a CRM in Google Sheets (Composio). The Sheets connection works; the write is not built.
- LinkedIn outreach: copy-ready messages. Invitations are never sent automatically.

## Architecture

| Part | What it does |
|---|---|
| `server.js` | Node HTTP server with no dependencies. Serves `public/` and two JSON routes: `GET /api/speakers?url=…` and `POST /api/enrich`. |
| `lib/discover.js` | Finds speakers on a conference page (JSON-LD, speaker cards, Parallel fallback). |
| `lib/enrich.js` | Calls Parallel Search per speaker and builds the bio, topics and sources. |
| `lib/util.js` | `.env` loader, cache file, and the Parallel client. API keys stay on the server. |
| `public/` | Plain HTML, CSS and JavaScript. `match.js` scores, `gallery.js` renders the grid, `profile.js` renders the drawer. |
| `data/speakers.json` | Local cache created on first run. It is git-ignored because it can contain personal details found on the web. |

Live integrations: Parallel Search (research and email finding) and Composio (Gmail drafts). Google Sheets is connected but not yet used by the app.

Other modules: `lib/email.js` (email finder), `lib/draft.js` (message template), `lib/composio.js` (Gmail draft client), `lib/links.js` (link checks), and `public/outreach.js` (the "Reach out" panel in the profile drawer).

## Install

Requirements: Node.js 18 or newer (developed on Node 24) and a Parallel API key. There are no npm dependencies to install.

```bash
git clone https://github.com/flaspa/ai-ambassador.git
cd ai-ambassador
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
```

Edit `.env` and fill in your keys:

- `PARALLEL_API_KEY`: from the [Parallel platform](https://platform.parallel.ai). Required for research.
- `COMPOSIO_API_KEY`: from [Composio](https://composio.dev), with write access. Create a Gmail auth config (Composio-managed) in that project and connect your Google account to it. Required for Gmail drafts.

## Run locally

```bash
node server.js
```

Open http://localhost:3210. Set the `PORT` environment variable to use another port.

1. Keep the prefilled MIT AI Conference URL, or paste another conference's speakers page.
2. Edit your interests, then select **Find my people**.
3. Select **Research with Parallel** to add bios, topics and sources (about 15 seconds for 73 speakers).
4. Open any card for the profile. Open `/?auto=1` to load speakers immediately.

## Security

Keys live only in the git-ignored `.env`. Never commit, print or share API keys, tokens or other credentials. The app does not send email or LinkedIn messages.
