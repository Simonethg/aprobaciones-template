// Obvious workshop fixtures. Not real posts, payments, or people.
// Seeded in English. When the UI is set to Spanish, presentItem / presentGoal swap in the ES copy below.
// Older seeds stored "English · Spanish" titles; those are still recognized.
import { APPROVER_NAME } from './actor.js';
import { normalizeFechaLimite } from './deadline.js';

// Title format used by older bilingual seeds.
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
    en: { titulo: 'Approved videos for Project A', indicador: 'Approved videos / total' },
    es: { titulo: 'Videos aprobados de Project A', indicador: 'Videos aprobados / total' },
  },
  'ventas-tienda': {
    en: { titulo: 'Shop sales (demo)', indicador: 'Sample percent and amount' },
    es: { titulo: 'Ventas de la tienda (demo)', indicador: 'Porcentaje y monto de ejemplo' },
  },
  'ventas-catalogo': {
    en: { titulo: 'Catalog sales (demo)', indicador: 'Sample USD' },
    es: { titulo: 'Ventas del catálogo (demo)', indicador: 'USD de ejemplo' },
  },
};

function knownTexts(pack) {
  const out = [];
  for (const lang of ['en', 'es']) {
    const row = pack[lang];
    for (const value of Object.values(row)) {
      if (typeof value === 'string') out.push(value);
      else if (Array.isArray(value)) out.push(...value);
    }
  }
  return out;
}

function overlay(item, pack, locale) {
  const lang = locale === 'es' ? 'es' : 'en';
  const next = pack[lang];
  const titles = [pack.es.titulo, pack.en.titulo, both(pack.en.titulo, pack.es.titulo)];
  if (!titles.includes(item.titulo)) return item;
  const copy = { ...item, ...next };
  if (Array.isArray(item.history)) {
    const notes = new Set(knownTexts(pack).concat(['Recibido', 'Received']));
    copy.history = item.history.map((entry) => {
      if (!entry || !notes.has(entry.nota)) return entry;
      if (entry.nota === 'Recibido' || entry.nota === 'Received') {
        return { ...entry, nota: lang === 'es' ? 'Recibido' : 'Received' };
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
  const lang = locale === 'es' ? 'es' : 'en';
  return { ...goal, ...pack[lang] };
}

export function demoItems(now = Date.now()) {
  const arrived = new Date(now - 2 * 864e5).toISOString();
  const yesterday = new Date(now - 864e5).toISOString();
  const soon = normalizeFechaLimite(new Date(now + 30 * 3600e3).toISOString());
  const received = (at, bot) => ({ status: 'pendiente', at, por: 'bot:' + bot, nota: 'Received' });
  return [
    {
      id: 'demo-post-001',
      titulo: DEMO_COPY['demo-post-001'].en.titulo,
      tipo: 'post',
      bot: 'Bot Demo',
      proyecto: 'Newsletter',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: 'https://example.com/demo/newsletter',
      resumen: DEMO_COPY['demo-post-001'].en.resumen,
      contenido: DEMO_COPY['demo-post-001'].en.contenido,
      status: 'pendiente',
      nota: '',
      updatedAt: arrived,
      history: [received(arrived, 'Bot Demo')],
    },
    {
      id: 'demo-video-001',
      titulo: DEMO_COPY['demo-video-001'].en.titulo,
      tipo: 'video',
      bot: 'Bot Demo',
      proyecto: 'Videos',
      fechaLlegada: yesterday,
      fechaLimite: soon,
      link: 'https://example.com/demo/video',
      resumen: DEMO_COPY['demo-video-001'].en.resumen,
      contenido: DEMO_COPY['demo-video-001'].en.contenido,
      status: 'pendiente',
      nota: '',
      updatedAt: yesterday,
      history: [received(yesterday, 'Bot Demo')],
    },
    {
      id: 'demo-pago-001',
      titulo: DEMO_COPY['demo-pago-001'].en.titulo,
      tipo: 'otro',
      bot: 'Bot Demo',
      proyecto: 'Project A',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: 'https://example.com/demo/payment',
      resumen: DEMO_COPY['demo-pago-001'].en.resumen,
      contenido: DEMO_COPY['demo-pago-001'].en.contenido,
      status: 'pendiente',
      nota: '',
      updatedAt: arrived,
      history: [received(arrived, 'Bot Demo')],
    },
    {
      id: 'demo-tarea-001',
      titulo: DEMO_COPY['demo-tarea-001'].en.titulo,
      tipo: 'tarea-manual',
      bot: 'Bot Demo',
      proyecto: 'Newsletter',
      fechaLlegada: yesterday,
      fechaLimite: soon,
      link: 'https://example.com/demo/task',
      resumen: DEMO_COPY['demo-tarea-001'].en.resumen,
      contenido: '',
      pasos: [...DEMO_COPY['demo-tarea-001'].en.pasos],
      status: 'pendiente',
      nota: '',
      updatedAt: yesterday,
      history: [received(yesterday, 'Bot Demo')],
    },
    {
      id: 'demo-ok-001',
      titulo: DEMO_COPY['demo-ok-001'].en.titulo,
      tipo: 'texto',
      bot: 'Bot Demo',
      proyecto: 'Project A',
      fechaLlegada: arrived,
      fechaLimite: null,
      link: '',
      resumen: DEMO_COPY['demo-ok-001'].en.resumen,
      contenido: DEMO_COPY['demo-ok-001'].en.contenido,
      status: 'aprobado',
      nota: '',
      respuesta: DEMO_COPY['demo-ok-001'].en.respuesta,
      respuestaAt: yesterday,
      updatedAt: yesterday,
      history: [
        received(arrived, 'Bot Demo'),
        { status: 'aprobado', at: yesterday, por: APPROVER_NAME, nota: DEMO_COPY['demo-ok-001'].en.respuesta },
      ],
    },
  ];
}
