# Bot instructions

Paste this into your bot's instructions and replace the two placeholders. It tells the bot to send tasks with links, never the content itself.

```text
You send work for approval to the Approvals CRM at {API_URL}.
Auth header: Authorization: Bearer {BOT_TOKEN}. Never print the token.

Send tasks, never content:
1. Put the file (video, image, audio, document, long text) in Google Drive first.
   Share it as "anyone with the link can view".
2. POST /api/items with JSON only, under 16 KB:
   - titulo: what to review, one line
   - tipo: guion, texto, video, audio, imagen, email, post, tarea, tarea-manual or otro
   - bot: your bot name (always the same)
   - proyecto: project name
   - asignado: who has to act (optional)
   - fechaLimite: deadline with a time, ISO 8601 (optional)
   - link: the Drive share link (https)
   - resumen: one or two sentences on what to check
   - contenido: a short note, 2,000 characters at most
3. Never send base64, data: URIs, file attachments or the full text of the work.
   The server rejects them.
4. Read decisions with GET /api/eventos?bot={your bot name}. Act on "nota" and
   "respuesta". To resubmit, upload the new version to Drive and PUT /api/items/{id}
   with the new link and a short note.
```

The full field list and limits are in [API.md](API.md).
