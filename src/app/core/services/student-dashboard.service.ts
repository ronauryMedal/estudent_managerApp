import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import {
  StudentDashboardPayload,
  StudentDashboardStats,
} from '../models/student-dashboard.model';
import { Task } from '../models/task.model';

const UPCOMING_TASK_LIMIT = 5;

function numFromRecord(
  obj: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && !Number.isNaN(v)) {
      return v;
    }
  }
  return undefined;
}

function hasAnyKey(obj: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((k) => k in obj);
}

/** Tareas no marcadas como completadas (si no existe `completed`, cuenta todas). */
export function countOpenTasks(tasks: Task[]): number {
  return tasks.filter((t) => t.completed !== true).length;
}

/** Próximas entregas: abiertas, por `dueDate` ascendente. */
export function pickUpcomingTasks(
  tasks: Task[],
  limit = UPCOMING_TASK_LIMIT,
): Task[] {
  const open = tasks.filter((t) => t.completed !== true);
  return [...open]
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    )
    .slice(0, limit);
}

@Injectable({ providedIn: 'root' })
export class StudentDashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Resumen del progreso + tareas (métricas y lista prioritaria). */
  loadDashboard(userId: string): Observable<StudentDashboardPayload> {
    return forkJoin({
      summary: this.http
        .get<unknown>(`${this.apiBase}/users/${userId}/progress/summary`)
        .pipe(catchError(() => of(null))),
      tasks: this.http
        .get<Task[]>(`${this.apiBase}/tasks`)
        .pipe(catchError(() => of([] as Task[]))),
    }).pipe(
      map(({ summary, tasks }) => {
        const record =
          summary && typeof summary === 'object' && !Array.isArray(summary)
            ? (summary as Record<string, unknown>)
            : {};
        return {
          stats: this.mergeStats(record, tasks),
          upcomingTasks: pickUpcomingTasks(tasks),
        };
      }),
    );
  }

  private mergeStats(
    summary: Record<string, unknown>,
    tasks: Task[],
  ): StudentDashboardStats {
    const totalKeys = [
      'totalSubjects',
      'total_subjects',
      'subjectsTotal',
      'subjects_total',
      'totalMaterias',
    ];
    const approvedKeys = [
      'approvedSubjects',
      'approved_subjects',
      'approved',
      'aprobadas',
      'passed',
      'passedSubjects',
    ];
    const failedKeys = [
      'failedSubjects',
      'failed_subjects',
      'failed',
      'reproved',
      'reprovedSubjects',
      'reproved_subjects',
      'reprobadas',
    ];
    const pendingTaskKeys = ['pendingTasks', 'pending_tasks', 'tasksPending'];

    const totalSubjects = numFromRecord(summary, totalKeys) ?? 0;
    const approvedSubjects = numFromRecord(summary, approvedKeys) ?? 0;
    const failedSubjects = numFromRecord(summary, failedKeys) ?? 0;

    let pendingTasks: number;
    if (hasAnyKey(summary, pendingTaskKeys)) {
      pendingTasks = numFromRecord(summary, pendingTaskKeys) ?? 0;
    } else {
      pendingTasks = countOpenTasks(tasks);
    }

    return {
      totalSubjects,
      approvedSubjects,
      failedSubjects,
      pendingTasks,
    };
  }
}
