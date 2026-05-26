import { Injectable, inject, signal } from '@angular/core';

import { CreateTaskRequest, Task } from '../models/task.model';
import { AuthService } from './auth.service';

const TASKS_CACHE_KEY_PREFIX = 'sm.offline.tasks';
const TASK_CREATE_QUEUE_KEY_PREFIX = 'sm.offline.taskCreates';

export interface PendingTaskCreate {
  id: string;
  userId: string;
  body: CreateTaskRequest;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

@Injectable({ providedIn: 'root' })
export class StudentTasksOfflineStoreService {
  private readonly auth = inject(AuthService);
  private readonly _pendingCreateCount = signal(0);

  readonly pendingCreateCount = this._pendingCreateCount.asReadonly();

  constructor() {
    this.refreshPendingCount();
  }

  readCachedTasks(): Task[] {
    return this.readJson<Task[]>(this.cacheKey(), []);
  }

  writeCachedTasks(tasks: Task[]): void {
    const serverTasks = tasks.filter((task) => !this.isLocalTaskId(task.id));
    this.writeJson(this.cacheKey(), serverTasks);
  }

  upsertCachedTask(task: Task): void {
    if (this.isLocalTaskId(task.id)) {
      return;
    }

    const next = [
      task,
      ...this.readCachedTasks().filter((cached) => cached.id !== task.id),
    ];
    this.writeCachedTasks(next);
  }

  readPendingCreates(): PendingTaskCreate[] {
    return this.readJson<PendingTaskCreate[]>(this.queueKey(), []);
  }

  cachedTasksWithPending(): Task[] {
    return [...this.pendingCreatesAsTasks(), ...this.readCachedTasks()];
  }

  addPendingCreate(body: CreateTaskRequest): Task {
    const now = new Date().toISOString();
    const userId = this.currentUserId();
    const pending: PendingTaskCreate = {
      id: `local-task-${this.randomId()}`,
      userId,
      body,
      createdAt: now,
      attempts: 0,
    };

    this.writePendingCreates([pending, ...this.readPendingCreates()]);
    return this.pendingCreateAsTask(pending);
  }

  removePendingCreate(id: string): void {
    this.writePendingCreates(
      this.readPendingCreates().filter((pending) => pending.id !== id),
    );
  }

  markPendingCreateAttempt(id: string, lastError?: string): void {
    this.writePendingCreates(
      this.readPendingCreates().map((pending) =>
        pending.id === id
          ? {
              ...pending,
              attempts: pending.attempts + 1,
              lastError,
            }
          : pending,
      ),
    );
  }

  isLocalTaskId(id: string): boolean {
    return id.startsWith('local-task-');
  }

  refreshPendingCount(): void {
    this._pendingCreateCount.set(this.readPendingCreates().length);
  }

  private pendingCreatesAsTasks(): Task[] {
    return this.readPendingCreates().map((pending) =>
      this.pendingCreateAsTask(pending),
    );
  }

  private pendingCreateAsTask(pending: PendingTaskCreate): Task {
    return {
      id: pending.id,
      userId: pending.userId,
      subjectId: pending.body.subjectId,
      title: pending.body.title,
      description: pending.body.description,
      dueDate: pending.body.dueDate,
      isCompleted: false,
      completed: false,
      createdAt: pending.createdAt,
      updatedAt: pending.createdAt,
      offlineStatus: 'pending',
    };
  }

  private writePendingCreates(queue: PendingTaskCreate[]): void {
    this.writeJson(this.queueKey(), queue);
    this._pendingCreateCount.set(queue.length);
  }

  private currentUserId(): string {
    return this.auth.currentUser()?.id ?? 'guest';
  }

  private cacheKey(): string {
    return `${TASKS_CACHE_KEY_PREFIX}.${this.currentUserId()}`;
  }

  private queueKey(): string {
    return `${TASK_CREATE_QUEUE_KEY_PREFIX}.${this.currentUserId()}`;
  }

  private randomId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  private readJson<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}
