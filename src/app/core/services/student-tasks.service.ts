import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import {
  CreateTaskRequest,
  Task,
  UpdateTaskRequest,
} from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class StudentTasksService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = apiOrigin(environment.apiUrl);

  /** Tareas del usuario autenticado (`GET /tasks`). */
  list(): Observable<Task[]> {
    return this.http
      .get<Task[]>(`${this.apiBase}/tasks`)
      .pipe(catchError(() => of([] as Task[])));
  }

  create(body: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.apiBase}/tasks`, body);
  }

  update(id: string, body: UpdateTaskRequest): Observable<Task> {
    return this.http.patch<Task>(`${this.apiBase}/tasks/${id}`, body);
  }

  delete(id: string): Observable<unknown> {
    return this.http.delete<unknown>(`${this.apiBase}/tasks/${id}`);
  }
}
