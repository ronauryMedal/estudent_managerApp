/** Utilidades de fecha de entrega para tarjetas de tareas. */

export function taskDueDayOffset(iso: string): number | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startDue.getTime() - startToday.getTime()) / 86_400_000);
}

export function taskDueRelativeLabel(iso: string): string {
  const diff = taskDueDayOffset(iso);
  if (diff === null) {
    return '';
  }
  if (diff < 0) {
    return 'Vencida';
  }
  if (diff === 0) {
    return 'Hoy';
  }
  if (diff === 1) {
    return 'Mañana';
  }
  return `En ${diff} días`;
}

export function taskDueTone(iso: string): 'danger' | 'warning' | 'ok' {
  const diff = taskDueDayOffset(iso);
  if (diff === null) {
    return 'ok';
  }
  if (diff < 0) {
    return 'danger';
  }
  if (diff <= 1) {
    return 'warning';
  }
  return 'ok';
}

export function taskIsDueUrgent(iso: string): boolean {
  const diff = taskDueDayOffset(iso);
  return diff !== null && diff <= 1;
}

/** Índice 0–5 para variar el color de acento por materia. */
export function taskSubjectAccentIndex(subjectId: string): number {
  let h = 0;
  for (let i = 0; i < subjectId.length; i++) {
    h = (h * 31 + subjectId.charCodeAt(i)) >>> 0;
  }
  return h % 6;
}
