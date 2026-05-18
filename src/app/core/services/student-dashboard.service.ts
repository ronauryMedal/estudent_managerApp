import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import {
  QuarterSubjectRow,
  StudentDashboardPayload,
} from '../models/student-dashboard.model';
import {
  Subject,
  SubjectModality,
  SUBJECT_MODALITY_LABELS,
} from '../models/subject.model';
import { subjectPlanQuarter } from '../utils/subject-quarter';
import { Task } from '../models/task.model';
import { User } from '../models/user.model';
import { UserApprovedSubject } from '../models/user-approved-subject.model';
import { UserCareer } from '../models/user-career.model';
import { studentAcademicRefs } from '../utils/student-academic-refs';
import { mergeSubjectForDisplay } from '../utils/merge-subject-display';
import {
  subjectCourseDetailLine,
  subjectScheduleLines,
} from '../utils/subject-schedule-display';

const UPCOMING_TASK_LIMIT = 5;

type ApprovedMine = UserApprovedSubject & { subject?: Subject };

/** Próximas entregas: abiertas, por `dueDate` ascendente. */
function pickUpcomingTasks(
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

  /** Tareas próximas + materias del cuatrimestre (o todas las inscritas si no hay filtro). */
  loadDashboard(user: User): Observable<StudentDashboardPayload> {
    return forkJoin({
      tasks: this.http
        .get<Task[]>(`${this.apiBase}/tasks`)
        .pipe(catchError(() => of([] as Task[]))),
      approved: this.http
        .get<ApprovedMine[]>(`${this.apiBase}/user-approved-subjects/me`)
        .pipe(catchError(() => of([] as ApprovedMine[]))),
      planSubjects: this.http
        .get<Subject[]>(`${this.apiBase}/subjects/me`)
        .pipe(catchError(() => of([] as Subject[]))),
      myCareer: this.http
        .get<UserCareer>(`${this.apiBase}/user-careers/me`)
        .pipe(catchError(() => of(null))),
    }).pipe(
      map(({ tasks, approved, planSubjects, myCareer }) => {
        const refs = studentAcademicRefs(user, myCareer);
        const quarterSubjects = this.buildQuarterSubjectRows(
          approved,
          planSubjects,
          refs,
        );
        const quarterSectionSubtitle =
          refs.currentSemester != null
            ? `Cuatrimestre académico n.º ${refs.currentSemester}`
            : null;

        return {
          upcomingTasks: pickUpcomingTasks(tasks),
          quarterSubjects,
          quarterSectionSubtitle,
        };
      }),
    );
  }

  private buildQuarterSubjectRows(
    approved: ApprovedMine[],
    planSubjects: Subject[],
    refs: ReturnType<typeof studentAcademicRefs>,
  ): QuarterSubjectRow[] {
    const byId = new Map<string, Subject>();
    for (const s of planSubjects) {
      byId.set(s.id, s);
    }
    for (const a of approved) {
      if (a.subject) {
        const fromPlan = byId.get(a.subject.id);
        byId.set(a.subject.id, mergeSubjectForDisplay(fromPlan, a.subject));
      }
    }

    const rows: QuarterSubjectRow[] = [];
    const seen = new Set<string>();
    for (const a of approved) {
      const sub = byId.get(a.subjectId);
      if (!sub || seen.has(sub.id)) {
        continue;
      }
      seen.add(sub.id);
      rows.push(this.toQuarterRow(sub));
    }

    const matchesCuatri = (r: QuarterSubjectRow) => {
      const sub = byId.get(r.id);
      if (!sub) {
        return false;
      }
      if (refs.careerId && sub.careerId !== refs.careerId) {
        return false;
      }
      if (refs.currentSemester != null) {
        return subjectPlanQuarter(sub) === refs.currentSemester;
      }
      return true;
    };

    const filtered = rows.filter(matchesCuatri);
    const use = filtered.length > 0 ? filtered : rows;

    use.sort((a, b) =>
      a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    );
    return use;
  }

  private toQuarterRow(sub: Subject): QuarterSubjectRow {
    const mod = sub.modality;
    const modalityLabel =
      mod && mod in SUBJECT_MODALITY_LABELS
        ? SUBJECT_MODALITY_LABELS[mod as SubjectModality]
        : '—';

    return {
      id: sub.id,
      name: sub.name,
      credits: sub.credits,
      semesterNumber: subjectPlanQuarter(sub),
      modalityLabel,
      scheduleLines: subjectScheduleLines(sub),
      courseDetailLine: subjectCourseDetailLine(sub),
    };
  }
}
