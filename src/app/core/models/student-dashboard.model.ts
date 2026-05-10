import { Task } from './task.model';

/** Métricas mostradas en el panel del estudiante. */
export interface StudentDashboardStats {
  totalSubjects: number;
  approvedSubjects: number;
  failedSubjects: number;
  pendingTasks: number;
}

/** Datos del panel: resumen + tareas abiertas ordenadas por fecha. */
export interface StudentDashboardPayload {
  stats: StudentDashboardStats;
  upcomingTasks: Task[];
}
