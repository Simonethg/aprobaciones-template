# Bot API

Bots talk to the app over plain JSON. **Send tasks, never content.** The app never stores files: upload the file to Drive and put the share link in `link`.

## Limits

| Rule | Response |
|---|---|
| Body over 16 KB | `413` |
| Content-Type other than `application/json` (multipart, files) | `415` |
| A `data:` URI or base64 blob in any field | `422` |
| `link` that is not `http(s)` | `400` |
| Bad JSON | `400` |

Text fields are trimmed to these lengths: `titulo` 300, `resumen`, `contenido`, `nota` 2,000, `link` 2,000, `proyecto` and `asignado` 120, `pasos` 20 lines of 300.

Every call sends:

```http
Authorization: Bearer <BOT_API_TOKEN>
```

The token doesn't say which bot is calling. The `bot` field does, so always send the same name.

## Field names

The API keeps its original field names and status values, so existing bots keep working. Here is what they mean:

| Field | Meaning |
|---|---|
| `titulo` | title (required) |
| `tipo` | item type, see below |
| `bot` | name of the bot that created the item |
| `proyecto` | project name, used by the project filter and history |
| `asignado` | assignee (optional, who has to act on it) |
| `link` | `http(s)` URL of the content, usually a Drive share link. Drive/Docs links get an embedded preview |
| `resumen` | short summary (max 2,000 characters) |
| `contenido` | short note (max 2,000 characters). Not the full text: that goes in Drive |
| `pasos` | steps of a manual task (array, or one step per line) |
| `fechaLimite` | deadline, ISO 8601 with a time. No zone means Argentina time (UTC-3) |
| `nota` | note or reason attached to a decision |
| `respuesta` | the reviewer's comment when approving |

Types (`tipo`): `guion` (script), `texto` (text), `video`, `audio`, `imagen` (image), `email`, `post`, `tarea` (task), `tarea-manual` (manual task), `otro` (other).

Statuses: `pendiente` (pending), `verificar` (to verify), `para-ops` (for Ops), `modificar` (changes requested), `aprobado` (approved), `rechazado` (rejected), `hecho` (done), `descartado` (discarded), `archivado` (archived). `todos` means every open status.

## Create an item

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

## Read the queue and the decisions

```bash
curl -s "$API/api/items?status=pendiente&bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/api/eventos?bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /api/eventos` (decision events) only works with the bot token. The optional `since` (ISO 8601) is exclusive: you get events strictly after that instant. Decisions come back as `aprobar` (approve), `modificar` (request changes) or `rechazar` (reject).

## Project history

Works with a session or the bot token:

```bash
curl -s "$API/api/historial?proyecto=Project%20A" \
  -H "Authorization: Bearer $TOKEN"
```

## What a bot can and can't do

A bot can't approve or reject. The person does that in the UI (Approve, Request changes, Reject) and can leave a comment.

A bot can:

- create items and read them,
- resubmit a revision with `PUT /api/items/<id>` (the status goes back to `pendiente`),
- archive its own items with `POST /api/items/<id>/archive`, sending the same `bot` name.

Error messages come back in English in the `error` field.

See `README.md` for setup, deploy steps and environment variables.
