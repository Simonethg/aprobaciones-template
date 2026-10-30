# Bot API (English)

The app does not store files. Put a shared link in `link` (for example a Drive share link). Every call sends:

```http
Authorization: Bearer <BOT_API_TOKEN>
```

The token does not name the bot. The `bot` field does.

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
    "link": "https://example.com/demo/newsletter",
    "resumen": "Draft to approve",
    "contenido": "Fictional text."
  }'
```

`tipo` may be `guion`, `texto`, `video`, `audio`, `imagen`, `email`, `post`, `tarea`, `tarea-manual`, or `otro`.

Read the queue and a decision:

```bash
curl -s "$API/api/items?status=pendiente&bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/api/eventos?bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /api/eventos` requires the bot token. Optional `since` (ISO) is exclusive. Decisions: `aprobar`, `modificar`, `rechazar`.

Project history (session or token):

```bash
curl -s "$API/api/historial?proyecto=Proyecto%20A" \
  -H "Authorization: Bearer $TOKEN"
```

A bot cannot approve or reject. The person does that in the UI (Approve, Request changes, Reject) and may leave a comment. The bot can create items, read them, resubmit a revision with `PUT /api/items/<id>`, and archive its own items with `POST /api/items/<id>/archive` and the same `bot` name.

See `README.md` for deploy steps and environment variable names.
