import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { Career, CreateMyCareerMeRequest } from '../models/career.model';

@Injectable({ providedIn: 'root' })
export class StudentCareerService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Carreras que creaste (`GET /careers/me`). */
  getMyCareers(): Observable<Career[]> {
    return this.http
      .get<Career[]>(`${this.apiBase}/careers/me`)
      .pipe(catchError(() => of([] as Career[])));
  }

  /** Crea tu carrera o curso (`POST /careers/me`). */
  createMyCareer(body: CreateMyCareerMeRequest): Observable<Career> {
    return this.http.post<Career>(`${this.apiBase}/careers/me`, body);
  }
}
