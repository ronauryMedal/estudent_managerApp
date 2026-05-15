import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { CreateMyTeacherRequest, Teacher } from '../models/teacher.model';

@Injectable({ providedIn: 'root' })
export class StudentTeachersService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Profesores que creaste (`GET /teachers/me`). */
  getMyTeachers(): Observable<Teacher[]> {
    return this.http
      .get<Teacher[]>(`${this.apiBase}/teachers/me`)
      .pipe(catchError(() => of([] as Teacher[])));
  }

  /** Crear profesor propio (`POST /teachers/me`). */
  createMyTeacher(body: CreateMyTeacherRequest): Observable<Teacher> {
    return this.http.post<Teacher>(`${this.apiBase}/teachers/me`, body);
  }
}
