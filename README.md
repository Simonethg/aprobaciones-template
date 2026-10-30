# Approvals CRM template

A small approvals app you can clone and deploy. Bots drop items that a person has to sign off on: drafts, posts, videos, payments. Each preview is a **link** (a shared Drive link, for example). Nothing gets uploaded, so you don't need paid media storage.

The UI is in English by default. A Spanish translation is included: switch it with the **English / Español** buttons at the top right (keyboard accessible, visible focus). The choice is saved in the browser. If nobody has picked one, the app uses Spanish only when the browser language is Spanish, and English otherwise. The document `lang` follows the selected language.

Decisions made in the UI are recorded under the name `Reviewer`. Change it in `lib/actor.js` if you want another label.

The sample data is fake: Project A, Newsletter and Videos. There are no real accounts, emails or links.

## Only tasks, never content

This app stores **tasks**, not the work itself. An item is a title, a status, a project, an assignee, a deadline, a short note, and a link to the real file in Google Drive (or any other `http(s)` URL).

Why: the free tiers of Vercel, Netlify and Turso count function calls, bandwidth and storage. A video, an image or a long document sent through the API would use up that quota fast, and every page load would send it again. A task with a link is a few hundred bytes, so a class project can run for months without paying anything.

What the server enforces:

- Request bodies over **16 KB** are rejected (`413`). Only JSON is accepted, so no file uploads or multipart forms (`415`).
- `data:` URIs and base64 blobs anywhere in the body are rejected (`422`). Upload the file to Drive and send the link instead.
- `link` must be an `http://` or `https://` URL.
- `resumen`, `contenido`, `nota` and replies are capped at **2,000 characters**. Steps (`pasos`) are capped at 20 lines of 300 characters.
- Previews are the Drive/Docs embed in an iframe, loaded by the browser. The server never downloads, proxies or caches files or thumbnails.

Media lives in Drive. Share the file with "anyone with the link" so the reviewer can open it.

## Features

- **Approvals:** a queue where you approve, request changes or reject. Your comment stays on the item and in its history.
- **My tasks:** manual tasks with steps.
- **Project filter:** the number next to each project counts only items in `pendiente` (pending) status.
- **Pending badge:** the red number on Approvals counts pending items only, and it follows the project filter.
- **Light and dark themes**, following the system theme until you pick one.
- **Optional goals.** Two of them can read a shop or a catalog if you set the matching variables. Without them they say "no source connected" and don't make up numbers.

## How a bot posts an item

Every call sends:

```http
Authorization: Bearer <BOT_API_TOKEN>
```

The token doesn't say which bot is calling. The `bot` field does.

```bash
export TOKEN="your-bot-token"
export API="https://your-app.example"

curl -s -X POST "$API/api/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Sample post",
    "tipo": "post",
    "bot": "Bot Demo",
    "proyecto": "Newsletter",
    "asignado": "Reviewer",
    "link": "https://drive.google.com/file/d/FILE_ID/view",
    "resumen": "Draft to approve",
    "contenido": "Check the subject line."
  }'
```

The API keeps its original field names (`titulo` is the title, `tipo` the type, `proyecto` the project, `asignado` the assignee, `resumen` the summary, `contenido` a short note). [`docs/API.md`](docs/API.md) has the full list of fields, types and statuses, and [`docs/BOT-PROMPT.md`](docs/BOT-PROMPT.md) has instructions you can paste into your bot.

For a video or a payment, upload the file wherever you like (Drive, for example), share it with anyone who has the link, and put that URL in `link`. The app doesn't keep the file. Drive and Docs links show the Drive embed, loaded by your browser. Any other URL shows up as a plain link.

Read the queue and the decisions:

```bash
curl -s "$API/api/items?status=pendiente&bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/api/eventos?bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /api/eventos` only accepts the bot token. The optional `since` (ISO 8601) is exclusive. Decisions are `aprobar` (approve), `modificar` (request changes) and `rechazar` (reject).

Project history (session or token):

```bash
curl -s "$API/api/historial?proyecto=Project%20A" \
  -H "Authorization: Bearer $TOKEN"
```

## Approving and commenting

1. Sign in with the access code (`ACCESS_CODE`).
2. Open **Approvals** or **My tasks**.
3. Filter by project if you need to.
4. On an item: **Approve** (comment optional), **Request changes** (note required) or **Reject** (reason required). Then confirm.
5. On a task: **Done**, **Discard**, or hand it to Ops.

A bot can't approve or reject with its token. Only the person in the UI can. The bot can create items, read them, resubmit a revision (`PUT /api/items/<id>`) and archive its own items (`POST /api/items/<id>/archive` with the same `bot`).

## Running locally

You need Node 20 or newer.

```bash
cp .env.example .env.local
```

Fill in `.env.local` (never commit it):

- `ACCESS_CODE`: the code for the login screen.
- `SESSION_SECRET`: a long random string used to sign the session cookie.
- `BOT_API_TOKEN`: the token your bots will send.

Without Turso, data is stored as JSON in `.data/` (already in `.gitignore`). The first run seeds 5 demo items and 3 goals. If you delete them all, they don't come back.

```bash
npm install
npm test
npm run dev
```

Then open `http://localhost:3000`.

## Deploying for free

Serverless functions don't keep files between requests. On Vercel Hobby and Netlify, use [Turso](https://turso.tech) (SQLite, free plan). The app creates its `kv` table on first use.

```bash
turso db create approvals-demo
turso db show approvals-demo --url
turso db tokens create approvals-demo
```

Host variables:

| Name | Required |
|---|---|
| `ACCESS_CODE` | yes |
| `SESSION_SECRET` | yes |
| `BOT_API_TOKEN` | yes |
| `TURSO_DATABASE_URL` | yes on Vercel and Netlify |
| `TURSO_AUTH_TOKEN` | yes on Vercel and Netlify |
| `WOO_URL`, `WOO_KEY`, `WOO_SECRET`, `WOO_PRODUCT_MATCH` | no. Adds up the USD of `completed` or `processing` orders whose product matches `WOO_PRODUCT_MATCH` (default `Demo Product`) and updates the `ventas-tienda` (shop sales) goal. |
| `GUMROAD_TOKEN` | no. Updates the `ventas-catalogo` (catalog sales) goal. |
| `VIDEO_GOAL_PROJECT` | no. The project whose approved videos count toward `videos-aprobados` (approved videos). Default `Project A`. |

You don't need Vercel Blob, Netlify Blobs or any media uploads.

### Vercel Hobby

1. Push this repository to your own Git account (don't reuse another project's history).
2. Import it in Vercel. Framework: Next.js. Plan: Hobby.
3. Add the variables above and deploy.

There's no `vercel.json`; Vercel detects Next.js on its own.

### Netlify (Free plan)

`netlify.toml` already sets up the Next.js plugin and `npm run build`.

1. New site from Git, pointing at the same repository.
2. Add the same variables, Turso included.
3. Deploy.

Netlify installs `@netlify/plugin-nextjs` from `netlify.toml`.

## Accessibility

The template targets WCAG 2.1 AA on the queue and the login screen:

- Text, link and button contrast in both themes (1.4.3). Brand orange always carries black text.
- Keyboard access for tabs, filters, cards and forms (2.1.1).
- Visible focus (2.4.7) and a "Skip to content" link (2.4.1).
- Name, role and value on buttons, fields, the pending badge and the goal bars (4.1.2).
- Main controls are at least 44 px (2.5.5).
- Status never relies on color alone: every badge has text.
- Preview embeds have a `title`.

## License

MIT. Copyright (c) 2026 SimonethG. See `LICENSE`.
