import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import {
  CreateSubjectScheduleRequest,
  SubjectSchedule,
} from '../models/subject-schedule.model';

@Injectable({ providedIn: 'root' })
export class StudentSubjectSchedulesService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Bloques de una materia (`GET /subjects/:subjectId/schedules`). */
  list(subjectId: string): Observable<SubjectSchedule[]> {
    return this.http.get<SubjectSchedule[]>(
      `${this.apiBase}/subjects/${subjectId}/schedules`,
    );
  }

  /** Añadir bloque (`POST /subjects/:subjectId/schedules`). */
  create(
    subjectId: string,
    body: CreateSubjectScheduleRequest,
  ): Observable<SubjectSchedule> {
    return this.http.post<SubjectSchedule>(
      `${this.apiBase}/subjects/${subjectId}/schedules`,
      body,
    );
  }

  /** Quitar bloque (`DELETE /subjects/:subjectId/schedules/:scheduleId`). */
  delete(subjectId: string, scheduleId: string): Observable<unknown> {
    return this.http.delete<unknown>(
      `${this.apiBase}/subjects/${subjectId}/schedules/${scheduleId}`,
    );
  }
}
