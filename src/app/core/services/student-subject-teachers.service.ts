import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

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
}
