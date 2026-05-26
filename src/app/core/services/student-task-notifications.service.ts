import { Capacitor } from '@capacitor/core';
import {
  LocalNotificationSchema,
  LocalNotifications,
  PermissionStatus,
} from '@capacitor/local-notifications';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Task } from '../models/task.model';
import { dedupeById } from '../utils/dedupe-by-id';
import { openTasks, taskIsCompleted } from '../utils/dedupe-tasks';

const CHANNEL_ID = 'task-reminders';
const DAY_BEFORE_MS = 86_400_000;

type TaskNotifKind = 'day-before' | 'due';

/** ID estable para cancelar/reprogramar la misma tarea. */
export function taskNotificationId(
  taskId: string,
  kind: TaskNotifKind,
): number {
  let h = 0;
  const key = `${taskId}:${kind}`;
  for (let i = 0; i < key.length; i++) {
    h = (Math.imul(31, h) + key.charCodeAt(i)) >>> 0;
  }
  return (h % 2_000_000_000) + 1;
}

@Injectable({ providedIn: 'root' })
export class StudentTaskNotificationsService {
  private readonly router = inject(Router);
  private readonly managedIds = new Set<number>();
  private initDone = false;
  private listenerRegistered = false;

  /** Solo en app nativa (Android/iOS). En navegador no hay recordatorios locales. */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  async initialize(): Promise<void> {
    if (!this.isSupported() || this.initDone) {
      return;
    }

    await this.ensureChannel();
    await this.requestPermissions();
    this.registerActionListener();
    this.initDone = true;
  }

  /**
   * Reprograma recordatorios para todas las tareas abiertas.
   * Cancela los anteriores y agenda: 1 día antes + fecha de entrega.
   */
  async syncTasks(
    tasks: Task[],
    subjectLabel?: (subjectId: string) => string,
  ): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    await this.initialize();
    const granted = await this.hasPermission();
    if (!granted) {
      return;
    }

    await this.cancelKnownTaskNotifications(tasks);

    const toSchedule: LocalNotificationSchema[] = [];
    const open = openTasks(dedupeById(tasks));
    const now = Date.now();

    for (const task of open) {
      if (taskIsCompleted(task)) {
        continue;
      }
      const dueMs = new Date(task.dueDate).getTime();
      if (Number.isNaN(dueMs)) {
        continue;
      }

      const subject = subjectLabel?.(task.subjectId)?.trim();
      const extras = {
        route: '/tabs/tab2',
        taskId: task.id,
        type: 'task',
      };

      const dayBeforeAt = dueMs - DAY_BEFORE_MS;
      if (dayBeforeAt > now + 5_000) {
        const id = taskNotificationId(task.id, 'day-before');
        toSchedule.push({
          id,
          title: 'Tarea mañana',
          body: this.buildBody(task.title, subject, 'day-before'),
          schedule: { at: new Date(dayBeforeAt), allowWhileIdle: true },
          channelId: CHANNEL_ID,
          extra: extras,
        });
        this.managedIds.add(id);
      }

      if (dueMs > now + 5_000) {
        const id = taskNotificationId(task.id, 'due');
        toSchedule.push({
          id,
          title: 'Entrega de tarea',
          body: this.buildBody(task.title, subject, 'due'),
          schedule: { at: new Date(dueMs), allowWhileIdle: true },
          channelId: CHANNEL_ID,
          extra: extras,
        });
        this.managedIds.add(id);
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  }

  /** Quita todos los recordatorios (p. ej. al cerrar sesión). */
  async clearAll(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }
    await this.cancelManaged();
  }

  async cancelForTaskIds(taskIds: string[]): Promise<void> {
    if (!this.isSupported() || taskIds.length === 0) {
      return;
    }

    const ids: number[] = [];
    for (const taskId of taskIds) {
      for (const kind of ['day-before', 'due'] as const) {
        const id = taskNotificationId(taskId, kind);
        if (this.managedIds.has(id)) {
          ids.push(id);
          this.managedIds.delete(id);
        }
      }
    }

    if (ids.length > 0) {
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      });
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') {
      return true;
    }
    if (current.display === 'denied') {
      return false;
    }

    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }

  private async hasPermission(): Promise<boolean> {
    const status: PermissionStatus =
      await LocalNotifications.checkPermissions();
    return status.display === 'granted';
  }

  private async cancelManaged(): Promise<void> {
    if (this.managedIds.size === 0) {
      return;
    }
    await LocalNotifications.cancel({
      notifications: [...this.managedIds].map((id) => ({ id })),
    });
    this.managedIds.clear();
  }

  private async cancelKnownTaskNotifications(tasks: Task[]): Promise<void> {
    const ids = new Set<number>(this.managedIds);
    for (const task of tasks) {
      ids.add(taskNotificationId(task.id, 'day-before'));
      ids.add(taskNotificationId(task.id, 'due'));
    }

    if (ids.size === 0) {
      return;
    }

    try {
      const pending = await LocalNotifications.getPending();
      const pendingIds = new Set(pending.notifications.map((n) => n.id));
      const toCancel = [...ids].filter((id) => pendingIds.has(id));
      if (toCancel.length > 0) {
        await LocalNotifications.cancel({
          notifications: toCancel.map((id) => ({ id })),
        });
      }
    } catch {
      await LocalNotifications.cancel({
        notifications: [...ids].map((id) => ({ id })),
      });
    }

    this.managedIds.clear();
  }

  private async ensureChannel(): Promise<void> {
    if (Capacitor.getPlatform() !== 'android') {
      return;
    }
    try {
      await LocalNotifications.createChannel({
        id: CHANNEL_ID,
        name: 'Recordatorios de tareas',
        description: 'Avisos antes de la fecha de entrega',
        importance: 4,
        visibility: 1,
        vibration: true,
      });
    } catch {
      /* Canal ya existe */
    }
  }

  private registerActionListener(): void {
    if (this.listenerRegistered) {
      return;
    }
    this.listenerRegistered = true;

    void LocalNotifications.addListener(
      'localNotificationActionPerformed',
      (event) => {
        const route = event.notification.extra?.['route'];
        if (typeof route === 'string' && route.startsWith('/')) {
          void this.router.navigateByUrl(route);
        }
      },
    );
  }

  private buildBody(
    title: string,
    subject: string | undefined,
    kind: TaskNotifKind,
  ): string {
    const trimmed = title.trim() || 'Tarea';
    const prefix =
      kind === 'day-before'
        ? `Mañana vence «${trimmed}»`
        : `Hoy vence «${trimmed}»`;
    if (subject) {
      return `${prefix} · ${subject}`;
    }
    return prefix;
  }
}
