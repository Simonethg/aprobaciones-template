# Aprobaciones (plantilla)

Plantilla para clonar y desplegar una página de aprobaciones. Un bot deja ítems que una persona tiene que aceptar: borradores, posts, videos, pagos. La vista previa es un **link** (por ejemplo un link compartido de Drive). No se suben archivos y no hace falta un almacenamiento de medios de pago.

La interfaz está en español y en inglés. Arriba a la derecha hay un selector **Español / English** (teclado, foco visible). Se guarda en el navegador y, si nadie eligió, sigue el idioma del navegador; si no es inglés, queda en español. El `lang` del documento cambia con el idioma. El nombre que queda en el historial cuando alguien decide desde la pantalla es `Revisor` (`lib/actor.js`); se puede cambiar ahí.

Los datos de ejemplo son ficticios: Proyecto A, Newsletter y Videos. No hay cuentas, correos ni links reales.

## Qué hace

- **Aprobaciones:** cola para aprobar, pedir cambios o rechazar. El comentario queda en el ítem y en el historial.
- **Tareas mías:** tareas manuales con pasos.
- **Filtro por proyecto:** el número al lado de cada proyecto cuenta solo ítems en estado `pendiente`.
- **Badge de pendientes:** en la sección Aprobaciones, el número rojo es solo lo pendiente (también respeta el filtro de proyecto).
- **Tema claro y oscuro**, y el tema del sistema si no se elige uno.
- **Idioma ES/EN** con el selector de la barra. Los ítems de demostración traen texto en los dos idiomas. La API para bots también está en `docs/API.es.md` y `docs/API.en.md`.
- **Metas** opcionales. Dos de ellas pueden leer una tienda o un catálogo si configurás esas variables. Si no, dicen «sin fuente conectada» y no inventan cifras.

## Cómo lo usa un bot

Todas las llamadas llevan:

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

Para un video o un pago, subí el archivo a donde quieras (Drive, por ejemplo), compartilo con «cualquier persona con el link» y pegá esa URL en `link`. La app no guarda el archivo. Si el link es de Drive o de Docs, la pantalla muestra el embed público. Cualquier otra URL se muestra como link.

Leer la cola y una decisión:

```bash
curl -s "$API/api/items?status=pendiente&bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"

curl -s "$API/api/eventos?bot=Bot%20Demo" \
  -H "Authorization: Bearer $TOKEN"
```

`GET /api/eventos` es solo para el token de bot. `since` (ISO) es opcional y excluye ese instante. Decisiones: `aprobar`, `modificar`, `rechazar`.

Historial de un proyecto (sesión o token):

```bash
curl -s "$API/api/historial?proyecto=Proyecto%20A" \
  -H "Authorization: Bearer $TOKEN"
```

## Cómo aprobar y comentar

1. Entrá con el código de acceso (`ACCESS_CODE`).
2. Elegí **Aprobaciones** o **Tareas mías**.
3. Filtrá por proyecto si hace falta.
4. En una pieza: **Aprobar** (comentario opcional), **Modificar** (nota obligatoria) o **Rechazar** (motivo obligatorio). Confirmá.
5. En una tarea: **Listo**, **Descartar** o **Buscá cómo resolverla vos**.

El bot no puede aprobar ni rechazar con el token. Eso lo hace la persona en la pantalla. El bot sí puede crear ítems, leerlos, reenviar una corrección (`PUT /api/items/<id>`) y archivar los suyos (`POST /api/items/<id>/archive` con el mismo `bot`).

## Correr en local

Hace falta Node 20 o más nuevo.

```bash
cp .env.example .env.local
```

Completá en `.env.local` (no lo subas al repositorio):

- `ACCESS_CODE`: código para entrar.
- `SESSION_SECRET`: texto largo y aleatorio para firmar la cookie.
- `BOT_API_TOKEN`: token que van a usar los bots.

Sin Turso, los JSON quedan en `.data/` (está en `.gitignore`). Al primer arranque se cargan 5 ítems de demostración y 3 metas. Si los borrás todos, no vuelven solos.

```bash
npm install
npm test
npm run dev
```

Abrí `http://localhost:3000`.

## Desplegar gratis

El disco de una función serverless no guarda datos entre requests. En Vercel Hobby y en Netlify usá [Turso](https://turso.tech) (SQLite, plan gratuito): la app crea sola la tabla `kv` la primera vez.

```bash
turso db create aprobaciones-demo
turso db show aprobaciones-demo --url
turso db tokens create aprobaciones-demo
```

Variables en el host:

| Nombre | Obligatoria |
|---|---|
| `ACCESS_CODE` | sí |
| `SESSION_SECRET` | sí |
| `BOT_API_TOKEN` | sí |
| `TURSO_DATABASE_URL` | sí en Vercel y Netlify |
| `TURSO_AUTH_TOKEN` | sí en Vercel y Netlify |
| `WOO_URL`, `WOO_KEY`, `WOO_SECRET`, `WOO_PRODUCT_MATCH` | no. Suma USD de pedidos `completed` o `processing` cuyo producto coincide con `WOO_PRODUCT_MATCH` (por defecto `Demo Product`) y actualiza la meta `ventas-tienda`. |
| `GUMROAD_TOKEN` | no. Actualiza la meta `ventas-catalogo`. |
| `VIDEO_GOAL_PROJECT` | no. Proyecto cuyos videos aprobados cuentan en `videos-aprobados` (por defecto `Proyecto A`). |

No hace falta Vercel Blob, Netlify Blobs ni subir medios.

### Vercel Hobby

1. Subí este repositorio a tu propia cuenta de Git (no reutilices el historial de otro proyecto).
2. Importalo en Vercel. Framework: Next.js. Plan: Hobby.
3. Cargá las variables de arriba y desplegá.

No hay `vercel.json`. Vercel detecta Next.js.

### Netlify (plan Free)

El archivo `netlify.toml` ya pide el plugin de Next.js y `npm run build`.

1. New site from Git, con el mismo repositorio.
2. Las mismas variables, incluida Turso.
3. Deploy.

Netlify instala `@netlify/plugin-nextjs` a partir de `netlify.toml`.

## Accesibilidad

La plantilla apunta a WCAG 2.1 AA en la cola y en el login:

- Contraste de texto, links y botones en tema claro y oscuro (1.4.3). El naranja de marca lleva texto negro.
- Teclado en pestañas, filtros, tarjetas y formularios (2.1.1).
- Foco visible (2.4.7) y un link «Saltar al contenido» (2.4.1).
- Nombre, rol y valor en botones, campos, el badge de pendientes y las barras de metas (4.1.2).
- Controles principales de al menos 44 px (2.5.5).
- El estado no depende solo del color: cada badge tiene texto.
- Los embeds de vista previa tienen `title`.

La UI no está traducida al inglés.

## Licencia

MIT. Copyright (c) 2026 SimonethG. Ver `LICENSE`.

---

# Approvals (template)

A clone-and-deploy approvals page. A bot drops items a person must accept: drafts, posts, videos, payments. Previews are **links** (for example a shared Drive link). The app does not upload files and does not need paid media storage.

The interface is Spanish and English. A **Español / English** switch sits at the top right (keyboard, visible focus). The choice is stored in the browser. If nobody has chosen, it follows the browser language and falls back to Spanish. The document `lang` updates with the language. Decisions made in the UI are signed `Revisor` (`lib/actor.js`). Change that constant if you want another label.

Sample data is fake: Proyecto A, Newsletter, and Videos. There are no real accounts, emails, or links.

## What it does

- **Aprobaciones:** queue to approve, request changes, or reject. The comment stays on the item and in the history.
- **Tareas mías:** manual tasks with steps.
- **Per-project filter:** the number next to a project counts items in status `pendiente` only.
- **Pending badge:** on Aprobaciones, the red number is pending items only (it follows the project filter).
- **Light and dark themes**, plus the system theme until you pick one.
- **ES/EN language** from the switch in the bar. Demo items include both languages. The bot API is also written in `docs/API.en.md` and `docs/API.es.md`.
- **Metas** (goals) are optional. Two of them can read a shop or a catalog when those variables are set. Otherwise they say «sin fuente conectada» and do not invent numbers.

## How a bot posts an item

Every call sends:

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
    "titulo": "Post de ejemplo",
    "tipo": "post",
    "bot": "Bot Demo",
    "proyecto": "Newsletter",
    "link": "https://example.com/demo/newsletter",
    "resumen": "Borrador para aprobar",
    "contenido": "Texto ficticio."
  }'
```

`tipo` may be `guion`, `texto`, `video`, `audio`, `imagen`, `email`, `post`, `tarea`, `tarea-manual`, or `otro`.

For a video or a payment, upload the file wherever you like (Drive, for example), share it with anyone who has the link, and put that URL in `link`. The app does not store the file. A Drive or Docs link is shown as the public embed. Any other URL is shown as a link.

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

## How to approve and comment

1. Sign in with the access code (`ACCESS_CODE`).
2. Open **Aprobaciones** or **Tareas mías**.
3. Filter by project if you need to.
4. On a piece: **Aprobar** (comment optional), **Modificar** (note required), or **Rechazar** (reason required). Confirm.
5. On a task: **Listo**, **Descartar**, or **Buscá cómo resolverla vos**.

A bot cannot approve or reject with the token. The person does that in the UI. The bot can create items, read them, resubmit a revision (`PUT /api/items/<id>`), and archive its own items (`POST /api/items/<id>/archive` with the same `bot`).

## Run locally

Node 20 or newer.

```bash
cp .env.example .env.local
```

Fill in `.env.local` (do not commit it):

- `ACCESS_CODE`: code for the login screen.
- `SESSION_SECRET`: a long random string that signs the cookie.
- `BOT_API_TOKEN`: token the bots will send.

Without Turso, JSON lives in `.data/` (gitignored). The first launch seeds 5 demo items and 3 goals. If you delete all of them, they do not come back.

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`.

## Deploy for free

A serverless function disk does not keep data between requests. On Vercel Hobby and Netlify use [Turso](https://turso.tech) (SQLite, free plan). The app creates the `kv` table on first use.

```bash
turso db create aprobaciones-demo
turso db show aprobaciones-demo --url
turso db tokens create aprobaciones-demo
```

Host variables:

| Name | Required |
|---|---|
| `ACCESS_CODE` | yes |
| `SESSION_SECRET` | yes |
| `BOT_API_TOKEN` | yes |
| `TURSO_DATABASE_URL` | yes on Vercel and Netlify |
| `TURSO_AUTH_TOKEN` | yes on Vercel and Netlify |
| `WOO_URL`, `WOO_KEY`, `WOO_SECRET`, `WOO_PRODUCT_MATCH` | no. Sums USD of `completed` or `processing` orders whose product matches `WOO_PRODUCT_MATCH` (default `Demo Product`) into the goal `ventas-tienda`. |
| `GUMROAD_TOKEN` | no. Updates the goal `ventas-catalogo`. |
| `VIDEO_GOAL_PROJECT` | no. Project whose approved videos count toward `videos-aprobados` (default `Proyecto A`). |

Vercel Blob, Netlify Blobs, and media uploads are not used.

### Vercel Hobby

1. Push this repository to your own Git account (do not reuse another project's history).
2. Import it in Vercel. Framework: Next.js. Plan: Hobby.
3. Set the variables above and deploy.

There is no `vercel.json`. Vercel detects Next.js.

### Netlify (Free plan)

`netlify.toml` already sets the Next.js plugin and `npm run build`.

1. New site from Git, same repository.
2. The same variables, including Turso.
3. Deploy.

Netlify installs `@netlify/plugin-nextjs` from `netlify.toml`.

## Accessibility

The template targets WCAG 2.1 AA on the queue and the login screen:

- Text, link, and button contrast in light and dark themes (1.4.3). Brand orange uses black text.
- Keyboard access for tabs, filters, cards, and forms (2.1.1).
- Visible focus (2.4.7) and a “Saltar al contenido” skip link (2.4.1).
- Name, role, and value on buttons, fields, the pending badge, and goal bars (4.1.2).
- Primary controls are at least 44 px (2.5.5).
- Status is not color alone: every badge has text.
- Preview embeds have a `title`.

The UI itself is not translated to English.

## License

MIT. Copyright (c) 2026 SimonethG. See `LICENSE`.
