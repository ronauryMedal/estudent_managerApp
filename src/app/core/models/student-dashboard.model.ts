import { Task } from './task.model';

/** Una fila de materia en el panel (cuatrimestre actual / inscritas). */
export interface QuarterSubjectRow {
  id: string;
  name: string;
  credits: number;
  semesterNumber: number;
  modalityLabel: string;
  /** Un renglón por bloque horario (ej. "Vie 18:00–20:00 · Lab 2"). */
  scheduleLines: string[];
  /** Edificio, sección, código de curso; null en virtual o sin datos. */
  courseDetailLine: string | null;
}

export interface StudentDashboardPayload {
  upcomingTasks: Task[];
  quarterSubjects: QuarterSubjectRow[];
  /** Ej. "Cuatrimestre académico n.º 3" o null si no hay datos para filtrar. */
  quarterSectionSubtitle: string | null;
}
