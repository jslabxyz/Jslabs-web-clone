# JS Labs Clone

A desk for one named job: inspect a public website and leave with a factory-ready brief.

Paste a URL. The service reads the live HTML, extracts structure, tokens, links and stack signals, then stores a job in this browser. You review the brief here. Nothing is published until a person decides.

This is a JS Labs tool, not a finished clone of the source site.

## What it does

1. **Inspect** a public `http`/`https` page (`POST /api/inspect`)
2. **Extract** title, copy, headings, internal/external links, images, colors, fonts and tech signals
3. **Write** a markdown brief the factory can build from
4. **Keep** jobs on this browser (`localStorage`) so you can reopen, copy, download, or email Jason

Private hosts, credentials in URLs, and non-HTML responses are rejected.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try `https://jslabs.xyz` from the desk.

```bash
npm run check   # lint + typecheck + build
```

## Routes

| Route | Job |
| --- | --- |
| `/` | Inspection desk |
| `/jobs` | Jobs saved on this browser |
| `/jobs/[id]` | Overview, tokens, structure, brief |
| `/how-it-works` | Factory handoff |
| `POST /api/inspect` | `{ "url": "https://..." }` |

## Notes

- Jobs are local to the browser. Clearing site data removes them.
- The inspector follows a short redirect chain and only fetches same-origin CSS for tokens.
- A person still approves spend, outbound messages, and production releases.
