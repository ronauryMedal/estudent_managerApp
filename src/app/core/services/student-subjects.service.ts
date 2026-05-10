import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { CreateMySubjectRequest, Subject } from '../models/subject.model';
import {
  AddMySubjectRequest,
  UserApprovedSubject,
} from '../models/user-approved-subject.model';
import { UserCareer } from '../models/user-career.model';

export type UserApprovedSubjectMine = UserApprovedSubject & {
  subject?: Subject;
};

@Injectable({ providedIn: 'root' })
export class StudentSubjectsService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Materias de tus carreras creadas por ti (`GET /subjects/me`). */
  getMyPlanSubjects(): Observable<Subject[]> {
    return this.http
      .get<Subject[]>(`${this.apiBase}/subjects/me`)
      .pipe(catchError(() => of([] as Subject[])));
  }

  createMySubject(body: CreateMySubjectRequest): Observable<Subject> {
    return this.http.post<Subject>(`${this.apiBase}/subjects/me`, body);
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
}
