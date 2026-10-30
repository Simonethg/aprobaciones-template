# API para bots (español)

La app no guarda archivos. El campo `link` lleva un enlace compartido (por ejemplo un link de Drive). Todas las llamadas envían:

```http
Authorization: Bearer <BOT_API_TOKEN>
```

El token no identifica al bot. El campo `bot` sí.

```bash
export TOKEN="your-bot-token"
export API="https://your-app.example"

curl -s -X POST "$API/api/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Post de ejemplo",
    "tipo": "post",
    "bot": "Bot Demo",
    "proyecto": "Newsletter",
    "link": "https://example.com/demo/newsletter",
    "resumen": "Borrador para aprobar",
    "contenido": "Texto ficticio."
  }'
```

`tipo` puede ser `guion`, `texto`, `video`, `audio`, `imagen`, `email`, `post`, `tarea`, `tarea-manual` u `otro`.

Leer la cola y una decisión:

```bash
curl -s "$API/api/items?status=pendiente&bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/api/eventos?bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /api/eventos` pide el token de bot. `since` (ISO) es opcional y excluye ese instante. Decisiones: `aprobar`, `modificar`, `rechazar`.

Historial de un proyecto (sesión o token):

```bash
curl -s "$API/api/historial?proyecto=Proyecto%20A" \
  -H "Authorization: Bearer $TOKEN"
```

El bot no puede aprobar ni rechazar. Eso lo hace la persona en la pantalla (Aprobar, Modificar, Rechazar) y puede dejar un comentario. El bot sí puede crear ítems, leerlos, reenviar una corrección con `PUT /api/items/<id>` y archivar los suyos con `POST /api/items/<id>/archive` y el mismo nombre de `bot`.

El despliegue y los nombres de variables están en `README.md`.
