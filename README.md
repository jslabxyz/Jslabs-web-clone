# JS Labs Clone

A desk and an HTTP service for one named job: inspect a public website and leave with a factory-ready brief.

Paste a URL in the desk (`jslabs.xyz` is enough), or call `/api/inspect` from another tool. The service reads the live HTML, extracts structure, tokens, links and stack signals, then returns JSON plus a markdown brief. The desk stores one job per page in this browser and can re-inspect it in place. Nothing is published until a person decides.

This is a JS Labs tool, not a finished clone of the source site.

## What it does

1. **Inspect** a public `http`/`https` page (`GET` or `POST /api/inspect`)
2. **Extract** title, copy, headings, internal/external links, images, colors, fonts and tech signals
3. **Write** a markdown brief the factory can build from
4. **Keep** desk jobs on this browser (`localStorage`), re-inspect the same page in place, copy curl, or download JSON / markdown

Private hosts, credentials in URLs, and non-HTML responses are rejected.

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Try `https://jslabs.xyz` from the desk.

```bash
npm run check   # lint + typecheck + test + build
```

## Use it as a service

```bash
curl -sS -X POST http://localhost:3000/api/inspect \
  -H 'content-type: application/json' \
  -d '{"url":"https://jslabs.xyz"}'
```

```bash
curl -sS 'http://localhost:3000/api/inspect?url=https://jslabs.xyz'
```

Successful responses look like `{ "ok": true, "inspection": { ... }, "briefMarkdown": "..." }`. Failures return `{ "ok": false, "error": "..." }` with status 400. Bare hosts such as `jslabs.xyz` are accepted; `https://` is added.

## Routes

| Route | Job |
| --- | --- |
| `/` | Inspection desk |
| `/jobs` | Jobs saved on this browser |
| `/jobs/[id]` | Overview, tokens, structure, brief |
| `/how-it-works` | Factory handoff and API notes |
| `GET/POST /api/inspect` | `{ "url": "https://..." }` |

## Notes

- Jobs are local to the browser. Re-inspecting the same page updates that job instead of creating a duplicate. Calling the API does not persist a job by itself.
- The inspector follows a short redirect chain and only fetches same-origin CSS for tokens.
- A person still approves spend, outbound messages, and production releases.
