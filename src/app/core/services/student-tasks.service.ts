import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, from, of, throwError } from 'rxjs';
import {
  catchError,
  concatMap,
  finalize,
  map,
  switchMap,
  tap,
  toArray,
} from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import {
  AiResearchOptions,
  AiResearchPdfFiles,
  CreateTaskAiExtras,
  CreateTaskRequest,
  Task,
  UpdateTaskRequest,
} from '../models/task.model';
import { NetworkStatusService } from './network-status.service';
import { StudentTasksOfflineStoreService } from './student-tasks-offline-store.service';

@Injectable({ providedIn: 'root' })
export class StudentTasksService {
  private readonly http = inject(HttpClient);
  private readonly network = inject(NetworkStatusService);
  private readonly offlineStore = inject(StudentTasksOfflineStoreService);
  private readonly apiBase = apiOrigin(environment.apiUrl);
  private readonly _syncingPendingCreates = signal(false);

  readonly isOnline = this.network.isOnline;
  readonly pendingCreateCount = this.offlineStore.pendingCreateCount;
  readonly syncingPendingCreates = this._syncingPendingCreates.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () =>
        this.syncPendingCreates().subscribe(),
      );
    }
  }

  /** Tareas del usuario autenticado (`GET /tasks`). */
  list(): Observable<Task[]> {
    this.offlineStore.refreshPendingCount();

    if (!this.network.isOnline()) {
      return of(this.offlineStore.cachedTasksWithPending());
    }

    return this.http
      .get<Task[]>(`${this.apiBase}/tasks`)
      .pipe(
        tap((tasks) => this.offlineStore.writeCachedTasks(tasks)),
        map((tasks) => this.withPendingCreates(tasks)),
        catchError(() => of(this.offlineStore.cachedTasksWithPending())),
      );
  }

  create(body: CreateTaskRequest, aiExtras?: CreateTaskAiExtras): Observable<Task> {
    this.offlineStore.refreshPendingCount();

    const pdfFiles = aiExtras?.pdfFiles;
    const hasPdfs = this.hasPdfFiles(pdfFiles);
    const wantsAi = !!body.generateAiResearch;

    if (hasPdfs && wantsAi && !this.network.isOnline()) {
      return throwError(
        () => new Error('Subir PDFs para la IA requiere conexión a internet.'),
      );
    }

    if (!this.network.isOnline()) {
      if (hasPdfs) {
        return throwError(
          () => new Error('Subir PDFs para la IA requiere conexión a internet.'),
        );
      }
      return of(this.offlineStore.addPendingCreate(body));
    }

    if (wantsAi && hasPdfs && aiExtras?.aiResearchOptions) {
      const { generateAiResearch: _ai, aiResearchOptions: _opts, ...taskBody } =
        body;
      const createBody: CreateTaskRequest = {
        ...taskBody,
        generateAiResearch: false,
      };

      return this.http.post<Task>(`${this.apiBase}/tasks`, createBody).pipe(
        switchMap((task) =>
          this.requestAiResearch(
            task.id,
            aiExtras.aiResearchOptions!,
            pdfFiles!,
          ).pipe(
            map((updated) => updated ?? task),
            catchError((err: HttpErrorResponse) => {
              this.offlineStore.upsertCachedTask(task);
              return throwError(() => err);
            }),
          ),
        ),
        tap((task) => this.offlineStore.upsertCachedTask(task)),
      );
    }

    return this.http.post<Task>(`${this.apiBase}/tasks`, body).pipe(
      tap((task) => this.offlineStore.upsertCachedTask(task)),
      catchError((err: HttpErrorResponse) => {
        if (this.isNetworkError(err)) {
          if (hasPdfs) {
            return throwError(
              () =>
                new Error(
                  'Subir PDFs para la IA requiere conexión a internet.',
                ),
            );
          }
          return of(this.offlineStore.addPendingCreate(body));
        }
        return throwError(() => err);
      }),
    );
  }

  /** `POST /tasks/:id/ai-research` con PDFs (`multipart/form-data`). */
  requestAiResearch(
    taskId: string,
    options: AiResearchOptions,
    files: AiResearchPdfFiles,
  ): Observable<Task> {
    const form = new FormData();
    if (files.bookPdf) {
      form.append('bookPdf', files.bookPdf, files.bookPdf.name);
    }
    if (files.questionnairePdf) {
      form.append(
        'questionnairePdf',
        files.questionnairePdf,
        files.questionnairePdf.name,
      );
    }
    form.append('aiResearchOptions', JSON.stringify(options));

    return this.http.post<Task>(
      `${this.apiBase}/tasks/${taskId}/ai-research`,
      form,
    );
  }

  update(id: string, body: UpdateTaskRequest): Observable<Task> {
    return this.http
      .patch<Task>(`${this.apiBase}/tasks/${id}`, body)
      .pipe(tap((task) => this.offlineStore.upsertCachedTask(task)));
  }

  delete(id: string): Observable<unknown> {
    if (this.offlineStore.isLocalTaskId(id)) {
      this.offlineStore.removePendingCreate(id);
      return of(null);
    }

    return this.http.delete<unknown>(`${this.apiBase}/tasks/${id}`);
  }

  syncPendingCreates(): Observable<Task[]> {
    this.offlineStore.refreshPendingCount();
    const queue = this.offlineStore.readPendingCreates();
    if (
      !this.network.isOnline() ||
      this._syncingPendingCreates() ||
      queue.length === 0
    ) {
      return of(this.offlineStore.cachedTasksWithPending());
    }

    this._syncingPendingCreates.set(true);

    return from(queue).pipe(
      concatMap((pending) =>
        this.http.post<Task>(`${this.apiBase}/tasks`, pending.body).pipe(
          tap((created) => {
            this.offlineStore.removePendingCreate(pending.id);
            this.offlineStore.upsertCachedTask(created);
          }),
          catchError((err: HttpErrorResponse) => {
            this.offlineStore.markPendingCreateAttempt(
              pending.id,
              this.syncErrorMessage(err),
            );
            return of(null);
          }),
        ),
      ),
      toArray(),
      switchMap(() => this.list()),
      finalize(() => this._syncingPendingCreates.set(false)),
    );
  }

  private hasPdfFiles(files?: AiResearchPdfFiles): boolean {
    return !!(files?.bookPdf || files?.questionnairePdf);
  }

  private withPendingCreates(tasks: Task[]): Task[] {
    return [
      ...this.offlineStore.cachedTasksWithPending().filter((task) =>
        this.offlineStore.isLocalTaskId(task.id),
      ),
      ...tasks,
    ];
  }

  private isNetworkError(err: HttpErrorResponse): boolean {
    return err.status === 0;
  }

  private syncErrorMessage(err: HttpErrorResponse): string {
    if (this.isNetworkError(err)) {
      return 'Sin conexión';
    }
    return err.message || 'No se pudo sincronizar';
  }
}
