import { redirect } from 'next/navigation';
import { whoIs } from '@/lib/auth';
import { sourceFlags } from '@/lib/goal-sync';
import { listGoals } from '@/lib/metas';
import { listAllItems } from '@/lib/store';
import { APPROVAL_TABS, GOAL_VIEWS, SECTIONS, TASK_VIEWS } from '@/lib/tabs';
import Board from './Board';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  if ((await whoIs()) !== 'session') redirect('/login');
  const sp = await searchParams;
  const section = SECTIONS.some(([k]) => k === sp?.seccion)
    ? sp.seccion
    : (sp?.tab === 'tareas' ? 'tareas' : 'aprobaciones');
  const tab = APPROVAL_TABS.some(([k]) => k === sp?.tab) ? sp.tab : 'hoy';
  const taskView = TASK_VIEWS.some(([k]) => k === sp?.vista) ? sp.vista : 'abiertas';
  const goalView = GOAL_VIEWS.some(([k]) => k === sp?.vista) ? sp.vista : 'todas';
  const [all, goals] = await Promise.all([listAllItems(), listGoals()]);
  return (
    <Board
      items={all}
      goals={goals}
      initialSection={section}
      initialTab={tab}
      initialTaskView={section === 'tareas' ? taskView : 'abiertas'}
      initialGoalView={section === 'metas' ? goalView : 'todas'}
      sources={sourceFlags()}
      now={Date.now()}
    />
  );
}
