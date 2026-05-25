import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { CreateMySubjectRequest, Subject } from '../models/subject.model';
import { SubjectTeacher } from '../models/subject-teacher.model';
import { Task } from '../models/task.model';
import {
  AddMySubjectRequest,
  UserApprovedSubject,
} from '../models/user-approved-subject.model';
import { UserCareer } from '../models/user-career.model';
import { AuthService } from './auth.service';
import { NetworkStatusService } from './network-status.service';

export type UserApprovedSubjectMine = UserApprovedSubject & {
  subject?: Subject;
};

@Injectable({ providedIn: 'root' })
export class StudentSubjectsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly network = inject(NetworkStatusService);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Materias de tus carreras creadas por ti (`GET /subjects/me`). */
  getMyPlanSubjects(): Observable<Subject[]> {
    if (!this.network.isOnline()) {
      return of(this.readCachedPlanSubjects());
    }

    return this.http
      .get<Subject[]>(`${this.apiBase}/subjects/me`)
      .pipe(
        tap((subjects) => this.writeCachedPlanSubjects(subjects)),
        catchError(() => of(this.readCachedPlanSubjects())),
      );
  }

  createMySubject(body: CreateMySubjectRequest): Observable<Subject> {
    return this.http.post<Subject>(`${this.apiBase}/subjects/me`, body);
  }

  /** Elimina una materia de tu plan (`DELETE /subjects/:id`). */
  deleteMySubject(subjectId: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiBase}/subjects/${subjectId}`);
  }

  /**
   * Quita enlaces (profesor, tareas, avance) y luego borra la materia.
   * Necesario si el API aún no hace cascade delete o falla por FK.
   */
  deleteMySubjectComplete(
    subjectId: string,
    enrollmentId?: string,
  ): Observable<unknown> {
    return forkJoin({
      links: this.http
        .get<SubjectTeacher[]>(`${this.apiBase}/subject-teachers/me`)
        .pipe(catchError(() => of([] as SubjectTeacher[]))),
      tasks: this.http
        .get<Task[]>(`${this.apiBase}/tasks`)
        .pipe(catchError(() => of([] as Task[]))),
    }).pipe(
      switchMap(({ links, tasks }) => {
        const steps: Observable<unknown>[] = [];
        if (enrollmentId) {
          steps.push(
            this.unenroll(enrollmentId).pipe(catchError(() => of(undefined))),
          );
        }
        for (const link of links.filter((l) => l.subjectId === subjectId)) {
          steps.push(
            this.http
              .delete(`${this.apiBase}/subject-teachers/${link.id}`)
              .pipe(catchError(() => of(undefined))),
          );
        }
        for (const task of tasks.filter((t) => t.subjectId === subjectId)) {
          steps.push(
            this.http
              .delete(`${this.apiBase}/tasks/${task.id}`)
              .pipe(catchError(() => of(undefined))),
          );
        }
        const cleanup$ = steps.length > 0 ? forkJoin(steps) : of([]);
        return cleanup$.pipe(switchMap(() => this.deleteMySubject(subjectId)));
      }),
    );
  }

  getMyEnrollments(): Observable<UserApprovedSubjectMine[]> {
    return this.http
      .get<UserApprovedSubjectMine[]>(
        `${this.apiBase}/user-approved-subjects/me`,
      )
      .pipe(catchError(() => of([] as UserApprovedSubjectMine[])));
  }

  getMyCareer(): Observable<UserCareer | null> {
    return this.http
      .get<UserCareer>(`${this.apiBase}/user-careers/me`)
      .pipe(catchError(() => of(null)));
  }

  enroll(body: AddMySubjectRequest): Observable<unknown> {
    return this.http.post<unknown>(
      `${this.apiBase}/user-approved-subjects/me`,
      body,
    );
  }

  unenroll(enrollmentId: string): Observable<unknown> {
    return this.http.delete<unknown>(
      `${this.apiBase}/user-approved-subjects/me/${enrollmentId}`,
    );
  }

  private readCachedPlanSubjects(): Subject[] {
    const raw = localStorage.getItem(this.planSubjectsCacheKey());
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as Subject[];
    } catch {
      localStorage.removeItem(this.planSubjectsCacheKey());
      return [];
    }
  }

  private writeCachedPlanSubjects(subjects: Subject[]): void {
    localStorage.setItem(this.planSubjectsCacheKey(), JSON.stringify(subjects));
  }

  private planSubjectsCacheKey(): string {
    return `sm.offline.planSubjects.${this.auth.currentUser()?.id ?? 'guest'}`;
  }
}
