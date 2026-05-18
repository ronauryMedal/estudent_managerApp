import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { SubjectTeacher } from '../models/subject-teacher.model';

/** Body de `POST /subject-teachers/me`. */
export interface LinkMySubjectTeacherRequest {
  subjectId: string;
  teacherId: string;
}

@Injectable({ providedIn: 'root' })
export class StudentSubjectTeachersService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Enlazar profesor propio con materia propia (`POST /subject-teachers/me`). */
  linkMine(body: LinkMySubjectTeacherRequest): Observable<SubjectTeacher> {
    return this.http.post<SubjectTeacher>(
      `${this.apiBase}/subject-teachers/me`,
      body,
    );
  }

  /** Asignaciones profesor–materia de tu plan (`GET /subject-teachers/me`). */
  getMyLinks(): Observable<SubjectTeacher[]> {
    return this.http
      .get<SubjectTeacher[]>(`${this.apiBase}/subject-teachers/me`)
      .pipe(catchError(() => of([] as SubjectTeacher[])));
  }

  /** Quitar enlace (`DELETE /subject-teachers/:id`). */
  unlink(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiBase}/subject-teachers/${id}`);
  }
}
