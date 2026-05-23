import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { User } from '../models/user.model';
import { UserCareer } from '../models/user-career.model';
import { normalizeUser } from '../utils/user-photo-url';

export type UserCareerMine = UserCareer & {
  career?: {
    id: string;
    name: string;
    institution?: string | null;
    totalSemester?: number;
  };
};

@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  getMe(): Observable<User> {
    return this.http
      .get<User>(`${this.apiBase}/users/me`)
      .pipe(map((user) => normalizeUser(user)));
  }

  getMyCareer(): Observable<UserCareerMine | null> {
    return this.http
      .get<UserCareerMine>(`${this.apiBase}/user-careers/me`)
      .pipe(catchError(() => of(null)));
  }

  uploadPhoto(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http
      .post<User>(`${this.apiBase}/users/me/photo`, formData)
      .pipe(map((user) => normalizeUser(user)));
  }

  deletePhoto(): Observable<User> {
    return this.http
      .delete<User>(`${this.apiBase}/users/me/photo`)
      .pipe(map((user) => normalizeUser(user)));
  }
}
