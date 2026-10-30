// Obvious workshop fixtures. Not real posts, payments, or people.
// Stored text includes both languages. The UI can narrow it with presentItem / presentGoal.
import { APPROVER_NAME } from './actor.js';
import { normalizeFechaLimite } from './deadline.js';

const both = (en, es) => `${en} · ${es}`;

export const DEMO_COPY = {
  'demo-post-001': {
    es: {
      titulo: 'Post de bienvenida (demo)',
      resumen: 'Borrador ficticio para el taller. No es una publicación real.',
      contenido: 'Hola. Este texto es de ejemplo. Se puede aprobar, pedir cambios o rechazar.',
    },
    en: {
      titulo: 'Welcome post (demo)',
      resumen: 'Fictional workshop draft. Not a real post.',
      contenido: 'Hello. This text is a sample. You can approve it, request changes, or reject it.',
    },
  },
  'demo-video-001': {
    es: {
      titulo: 'Video de presentación (demo)',
      resumen: 'Enlace de ejemplo. En un caso real, pegá un link compartido de Drive.',
      contenido: 'Guion ficticio: saludo, una idea, cierre.',
    },
    en: {
      titulo: 'Intro video (demo)',
      resumen: 'Sample link. For a real file, paste a shared Drive link.',
      contenido: 'Fictional script: greeting, one idea, ending.',
    },
  },
  'demo-pago-001': {
    es: {
      titulo: 'Pago de ejemplo (demo)',
      resumen: 'Monto ficticio de 10 unidades. No hay dinero real.',
      contenido: 'Concepto: ejemplo de taller. Beneficiario: Persona Ejemplo.',
    },
    en: {
      titulo: 'Sample payment (demo)',
      resumen: 'Fictional amount of 10 units. No real money.',
      contenido: 'Concept: workshop sample. Payee: Example Person.',
    },
  },
  'demo-tarea-001': {
    es: {
      titulo: 'Revisar el borrador de bienvenida (demo)',
      resumen: 'Tarea ficticia para la sección Tareas mías.',
      pasos: ['Abrí el post de ejemplo', 'Dejá un comentario', 'Marcá la tarea como lista'],
    },
    en: {
      titulo: 'Review the welcome draft (demo)',
      resumen: 'Fictional task for the My tasks section.',
      pasos: ['Open the sample post', 'Leave a comment', 'Mark the task done'],
    },
  },
  'demo-ok-001': {
    es: {
      titulo: 'Borrador ya revisado (demo)',
      resumen: 'Este ítem ya está aprobado para mostrar el historial.',
      contenido: 'Texto ficticio que ya pasó por la cola.',
      respuesta: 'Aprobado como ejemplo. No es un contenido real.',
    },
    en: {
      titulo: 'Draft already reviewed (demo)',
      resumen: 'This item is already approved so the history has something to show.',
      contenido: 'Fictional text that already went through the queue.',
      respuesta: 'Approved as a sample. Not real content.',
    },
  },
};

export const GOAL_COPY = {
  'videos-aprobados': {
    es: { titulo: 'Videos aprobados de Proyecto A', indicador: 'Videos aprobados / total' },
    en: { titulo: 'Approved videos for Proyecto A', indicador: 'Approved videos / total' },
  },
  'ventas-tienda': {
    es: { titulo: 'Ventas de la tienda (demo)', indicador: 'Porcentaje y monto de ejemplo' },
    en: { titulo: 'Shop sales (demo)', indicador: 'Sample percent and amount' },
  },
  'ventas-catalogo': {
    es: { titulo: 'Ventas del catálogo (demo)', indicador: 'USD de ejemplo' },
    en: { titulo: 'Catalog sales (demo)', indicador: 'Sample USD' },
  },
};

function knownTexts(pack) {
  const out = [];
  for (const lang of ['es', 'en']) {
    const row = pack[lang];
    for (const value of Object.values(row)) {
      if (typeof value === 'string') out.push(value);
      else if (Array.isArray(value)) out.push(...value);
    }
  }
  return out;
}

function overlay(item, pack, locale) {
  const lang = locale === 'en' ? 'en' : 'es';
  const next = pack[lang];
  const titles = [pack.es.titulo, pack.en.titulo, both(pack.en.titulo, pack.es.titulo)];
  if (!titles.includes(item.titulo)) return item;
  const copy = { ...item, ...next };
  if (Array.isArray(item.history)) {
    const notes = new Set(knownTexts(pack).concat(['Recibido', 'Received']));
    copy.history = item.history.map((entry) => {
      if (!entry || !notes.has(entry.nota)) return entry;
      if (entry.nota === 'Recibido' || entry.nota === 'Received') {
        return { ...entry, nota: lang === 'en' ? 'Received' : 'Recibido' };
      }
      return { ...entry, nota: next.respuesta || next.contenido || entry.nota };
    });
  }
  return copy;
}

export function presentItem(item, locale) {
  const pack = DEMO_COPY[item?.id];
  if (!pack) return item;
  return overlay(item, pack, locale);
}

export function presentGoal(goal, locale) {
  const pack = GOAL_COPY[goal?.id];
  if (!pack) return goal;
  const titles = [pack.es.titulo, pack.en.titulo, both(pack.en.titulo, pack.es.titulo)];
  if (!titles.includes(goal.titulo)) return goal;
  const lang = locale === 'en' ? 'en' : 'es';
  return { ...goal, ...pack[lang] };
}

export function demoItems(now = Date.now()) {
  const arrived = new Date(now - 2 * 864e5).toISOString();
  const yesterday = new Date(now - 864e5).toISOString();
  const soon = normalizeFechaLimite(new Date(now + 30 * 3600e3).toISOString());
  const received = (at, bot) => ({ status: 'pendiente', at, por: 'bot:' + bot, nota: 'Recibido' });
  return [
    {
      id: 'demo-post-001',
      titulo: both(DEMO_COPY['demo-post-001'].en.titulo, DEMO_COPY['demo-post-001'].es.titulo),
      tipo: 'post',
      bot: 'Bot Demo',
      proyecto: 'Newsletter',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: 'https://example.com/demo/newsletter',
      resumen: both(DEMO_COPY['demo-post-001'].en.resumen, DEMO_COPY['demo-post-001'].es.resumen),
      contenido: `${DEMO_COPY['demo-post-001'].en.contenido}\n\n${DEMO_COPY['demo-post-001'].es.contenido}`,
      status: 'pendiente',
      nota: '',
      updatedAt: arrived,
      history: [received(arrived, 'Bot Demo')],
    },
    {
      id: 'demo-video-001',
      titulo: both(DEMO_COPY['demo-video-001'].en.titulo, DEMO_COPY['demo-video-001'].es.titulo),
      tipo: 'video',
      bot: 'Bot Demo',
      proyecto: 'Videos',
      fechaLlegada: yesterday,
      fechaLimite: soon,
      link: 'https://example.com/demo/video',
      resumen: both(DEMO_COPY['demo-video-001'].en.resumen, DEMO_COPY['demo-video-001'].es.resumen),
      contenido: `${DEMO_COPY['demo-video-001'].en.contenido}\n\n${DEMO_COPY['demo-video-001'].es.contenido}`,
      status: 'pendiente',
      nota: '',
      updatedAt: yesterday,
      history: [received(yesterday, 'Bot Demo')],
    },
    {
      id: 'demo-pago-001',
      titulo: both(DEMO_COPY['demo-pago-001'].en.titulo, DEMO_COPY['demo-pago-001'].es.titulo),
      tipo: 'otro',
      bot: 'Bot Demo',
      proyecto: 'Proyecto A',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: 'https://example.com/demo/payment',
      resumen: both(DEMO_COPY['demo-pago-001'].en.resumen, DEMO_COPY['demo-pago-001'].es.resumen),
      contenido: `${DEMO_COPY['demo-pago-001'].en.contenido}\n\n${DEMO_COPY['demo-pago-001'].es.contenido}`,
      status: 'pendiente',
      nota: '',
      updatedAt: arrived,
      history: [received(arrived, 'Bot Demo')],
    },
    {
      id: 'demo-tarea-001',
      titulo: both(DEMO_COPY['demo-tarea-001'].en.titulo, DEMO_COPY['demo-tarea-001'].es.titulo),
      tipo: 'tarea-manual',
      bot: 'Bot Demo',
      proyecto: 'Newsletter',
      fechaLlegada: yesterday,
      fechaLimite: soon,
      link: 'https://example.com/demo/task',
      resumen: both(DEMO_COPY['demo-tarea-001'].en.resumen, DEMO_COPY['demo-tarea-001'].es.resumen),
      contenido: '',
      pasos: DEMO_COPY['demo-tarea-001'].es.pasos.map((step, i) => both(DEMO_COPY['demo-tarea-001'].en.pasos[i], step)),
      status: 'pendiente',
      nota: '',
      updatedAt: yesterday,
      history: [received(yesterday, 'Bot Demo')],
    },
    {
      id: 'demo-ok-001',
      titulo: both(DEMO_COPY['demo-ok-001'].en.titulo, DEMO_COPY['demo-ok-001'].es.titulo),
      tipo: 'texto',
      bot: 'Bot Demo',
      proyecto: 'Proyecto A',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: '',
      resumen: both(DEMO_COPY['demo-ok-001'].en.resumen, DEMO_COPY['demo-ok-001'].es.resumen),
      contenido: `${DEMO_COPY['demo-ok-001'].en.contenido}\n\n${DEMO_COPY['demo-ok-001'].es.contenido}`,
      status: 'aprobado',
      nota: '',
      respuesta: both(DEMO_COPY['demo-ok-001'].en.respuesta, DEMO_COPY['demo-ok-001'].es.respuesta),
      respuestaAt: yesterday,
      updatedAt: yesterday,
      history: [
        received(arrived, 'Bot Demo'),
        { status: 'aprobado', at: yesterday, por: APPROVER_NAME, nota: 'Aprobado como ejemplo. No es un contenido real.' },
      ],
    },
  ];
}
