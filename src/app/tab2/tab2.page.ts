import { NgClass } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { forkJoin, Subscription, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  add,
  bookOutline,
  calendarOutline,
  checkmarkDoneOutline,
  clipboardOutline,
  sparklesOutline,
  trashOutline,
} from 'ionicons/icons';

import { Subject } from '../core/models/subject.model';
import { Task } from '../core/models/task.model';
import { StudentNotifyService } from '../core/services/student-notify.service';
import { StudentSubjectsService } from '../core/services/student-subjects.service';
import { StudentTaskNotificationsService } from '../core/services/student-task-notifications.service';
import { StudentTasksService } from '../core/services/student-tasks.service';
import { dedupeById } from '../core/utils/dedupe-by-id';
import { dedupeSubjects } from '../core/utils/dedupe-subjects';
import {
  dedupeTasks,
  openTasks,
  sortTasksByDue,
  taskContentKey,
  taskIsCompleted,
} from '../core/utils/dedupe-tasks';
import {
  taskDueRelativeLabel,
  taskDueTone,
  taskIsDueUrgent,
  taskSubjectAccentIndex,
} from '../core/utils/task-due-display';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';
import { StudentNavBackComponent } from '../shared/student-nav-back.component';
import { AnimateInDirective } from '../shared/animate-in.directive';

type TaskFilter = 'pending' | 'completed';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    NgClass,
    StudentMenuButtonsComponent,
    StudentNavBackComponent,
    AnimateInDirective,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonToggle,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonModal,
  ],
})
export class Tab2Page {
  private readonly fb = inject(FormBuilder);
  private readonly tasksApi = inject(StudentTasksService);
  private readonly subjectsApi = inject(StudentSubjectsService);
  private readonly notify = inject(StudentNotifyService);
  private readonly taskNotifications = inject(StudentTaskNotificationsService);
  private readonly destroyRef = inject(DestroyRef);

  private loadSub?: Subscription;
  private createSub?: Subscription;
  private deleteSub?: Subscription;
  private syncSub?: Subscription;

  readonly loading = signal(false);
  readonly createOpen = signal(false);
  readonly createSubmitting = signal(false);
  readonly deletingTaskId = signal<string | null>(null);
  readonly completingTaskId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly taskFilter = signal<TaskFilter>('pending');
  readonly planSubjects = signal<Subject[]>([]);
  readonly pendingTasks = computed(() => openTasks(this.tasks()));
  readonly completedTasks = computed(() =>
    sortTasksByDue(dedupeTasks(this.tasks()).filter((task) => taskIsCompleted(task))),
  );
  readonly visibleTasks = computed(() =>
    this.taskFilter() === 'completed'
      ? this.completedTasks()
      : this.pendingTasks(),
  );
  readonly emptyMessage = computed(() =>
    this.taskFilter() === 'completed'
      ? 'Todavía no marcaste tareas como realizadas.'
      : 'No tenés tareas pendientes. Pulsa + para crear una.',
  );
  readonly isOnline = this.tasksApi.isOnline;
  readonly pendingCreateCount = this.tasksApi.pendingCreateCount;
  readonly syncingPendingCreates = this.tasksApi.syncingPendingCreates;
  readonly offlineBannerMessage = computed(() => {
    const pending = this.pendingCreateCount();
    if (!this.isOnline()) {
      return pending > 0
        ? `Sin conexión: mostrando datos guardados. ${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de sincronizar.`
        : 'Sin conexión: mostrando la última información guardada.';
    }
    if (this.syncingPendingCreates()) {
      return 'Sincronizando tareas pendientes...';
    }
    if (pending > 0) {
      return `${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de sincronizar.`;
    }
    return null;
  });

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    dueDate: ['', Validators.required],
    subjectId: ['', Validators.required],
    generateAiResearch: [false],
  });

  constructor() {
    addIcons({
      add,
      bookOutline,
      clipboardOutline,
      calendarOutline,
      checkmarkDoneOutline,
      sparklesOutline,
      trashOutline,
    });
    this.destroyRef.onDestroy(() => {
      this.loadSub?.unsubscribe();
      this.createSub?.unsubscribe();
      this.deleteSub?.unsubscribe();
      this.syncSub?.unsubscribe();
    });
  }

  ionViewWillEnter(): void {
    void this.prepareLocalNotifications();
    this.syncPendingCreates();
    this.reload();
  }

  private async prepareLocalNotifications(): Promise<void> {
    if (!this.taskNotifications.isSupported()) {
      return;
    }
    await this.taskNotifications.initialize();
    const granted = await this.taskNotifications.requestPermissions();
    if (!granted && !sessionStorage.getItem('task-notif-hint')) {
      sessionStorage.setItem('task-notif-hint', '1');
      void this.notify.info(
        'Permití notificaciones del sistema para recordatorios de entregas.',
      );
    }
  }

  subjectLabel(subjectId: string): string {
    return (
      this.planSubjects().find((s) => s.id === subjectId)?.name ?? 'Materia'
    );
  }

  formatDue(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleString('es', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  dueRelativeLabel(iso: string): string {
    return taskDueRelativeLabel(iso);
  }

  dueTone(iso: string): string {
    return taskDueTone(iso);
  }

  isDueUrgent(iso: string): boolean {
    return taskIsDueUrgent(iso);
  }

  subjectAccentClass(subjectId: string): string {
    return `tasks-card--accent-${taskSubjectAccentIndex(subjectId)}`;
  }

  taskTrackKey(task: Task): string {
    return taskContentKey(task);
  }

  isCompleted(task: Task): boolean {
    return taskIsCompleted(task);
  }

  setTaskFilter(filter: TaskFilter): void {
    this.taskFilter.set(filter);
  }

  isPendingTask(task: Task): boolean {
    return task.offlineStatus === 'pending' || task.id.startsWith('local-task-');
  }

  reload(event?: { target?: { complete?: () => void } }): void {
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadSub = this.tasksApi
      .list()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          event?.target?.complete?.();
        }),
      )
      .subscribe({
        next: (list) => {
          this.applyTaskList(list);
        },
        error: () => {
          this.errorMessage.set(
            'No se pudieron cargar las tareas. Revisá la conexión.',
          );
        },
      });

    this.subjectsApi.getMyPlanSubjects().subscribe({
      next: (subjects) => {
        this.planSubjects.set(
          dedupeSubjects(dedupeById(subjects)).sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
          ),
        );
      },
    });
  }

  openCreateModal(): void {
    if (this.planSubjects().length === 0) {
      void this.notify.warning(
        'Creá al menos una materia en la pestaña Materias para enlazar tareas.',
      );
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const localDue = this.toDatetimeLocalValue(tomorrow);

    this.form.reset({
      title: '',
      description: '',
      dueDate: localDue,
      subjectId: this.planSubjects()[0]!.id,
      generateAiResearch: false,
    });
    this.createOpen.set(true);
  }

  closeCreateModal(): void {
    this.createOpen.set(false);
  }

  submitCreate(): void {
    if (this.createSubmitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const due = new Date(v.dueDate);
    if (Number.isNaN(due.getTime())) {
      void this.notify.warning('La fecha de entrega no es válida.');
      return;
    }

    const body = {
      title: v.title.trim(),
      description: v.description.trim() || undefined,
      dueDate: due.toISOString(),
      subjectId: v.subjectId,
      generateAiResearch: v.generateAiResearch,
    };

    this.createSub?.unsubscribe();
    this.createSubmitting.set(true);
    let createdOffline = false;
    this.createSub = this.tasksApi
      .create(body)
      .pipe(
        switchMap((task) => {
          createdOffline = this.isPendingTask(task);
          return this.tasksApi.list();
        }),
        finalize(() => {
          this.createSubmitting.set(false);
          this.createSub = undefined;
        }),
      )
      .subscribe({
        next: (list) => {
          this.applyTaskList(list);
          void this.notify.success(
            createdOffline
              ? 'Tarea guardada sin conexión. Se sincronizará al volver internet.'
              : v.generateAiResearch
                ? 'Tarea creada. La IA generará el PDF y lo enviará a tu correo.'
                : 'Tarea creada.',
          );
          this.closeCreateModal();
        },
        error: () => {
          void this.notify.error('No se pudo crear la tarea.');
        },
      });
  }

  async confirmDelete(task: Task): Promise<void> {
    if (this.deletingTaskId()) {
      return;
    }

    if (!this.isOnline() && !this.isPendingTask(task)) {
      void this.notify.warning(
        'Sin conexión solo podés eliminar tareas creadas offline que aún no se sincronizaron.',
      );
      return;
    }

    const ok = await this.notify.confirm({
      header: 'Eliminar tarea',
      message: `¿Eliminar «${task.title}»?`,
      confirmText: 'Eliminar',
      destructive: true,
      overModal: true,
    });
    if (ok) {
      this.deleteTask(task);
    }
  }

  completeTask(task: Task): void {
    if (this.completingTaskId() || this.deletingTaskId()) {
      return;
    }

    if (this.isPendingTask(task)) {
      this.deleteTask(task, 'completed');
      return;
    }

    if (!this.isOnline()) {
      void this.notify.warning(
        'Necesitás conexión para marcar esta tarea como realizada.',
      );
      return;
    }

    const key = taskContentKey(task);
    this.completingTaskId.set(task.id);
    this.tasksApi
      .list()
      .pipe(
        switchMap((list) => {
          const ids = [
            ...new Set(
              list
                .filter((t) => taskContentKey(t) === key)
                .map((t) => t.id)
                .filter(Boolean),
            ),
          ];
          const toComplete = ids.length > 0 ? ids : [task.id];
          return forkJoin(
            toComplete.map((id) =>
              this.tasksApi
                .update(id, { isCompleted: true })
                .pipe(catchError(() => of(null))),
            ),
          );
        }),
        switchMap(() => this.tasksApi.list()),
        finalize(() => this.completingTaskId.set(null)),
      )
      .subscribe({
        next: (list) => {
          this.applyTaskList(list);
          void this.notify.success(
            'Tarea marcada como realizada. Ya no recibirás recordatorios.',
          );
        },
        error: () => {
          void this.notify.error('No se pudo actualizar la tarea.');
        },
      });
  }

  private applyTaskList(list: Task[]): void {
    this.tasks.set(sortTasksByDue(dedupeTasks(dedupeById(list))));
    void this.taskNotifications.syncTasks(list, (id) => this.subjectLabel(id));
  }

  private syncPendingCreates(): void {
    if (!this.isOnline() || this.pendingCreateCount() === 0) {
      return;
    }

    this.syncSub?.unsubscribe();
    this.syncSub = this.tasksApi.syncPendingCreates().subscribe({
      next: (list) => {
        this.applyTaskList(list);
      },
    });
  }

  private deleteTask(task: Task, reason: 'delete' | 'completed' = 'delete'): void {
    if (this.deletingTaskId()) {
      return;
    }

    const key = taskContentKey(task);
    this.deleteSub?.unsubscribe();
    this.deletingTaskId.set(task.id);
    this.deleteSub = this.tasksApi
      .list()
      .pipe(
        switchMap((list) => {
          const ids = this.isPendingTask(task)
            ? [task.id]
            : [
                ...new Set(
                  list
                    .filter((t) => taskContentKey(t) === key)
                    .map((t) => t.id)
                    .filter(Boolean),
                ),
              ];
          const toDelete = ids.length > 0 ? ids : [task.id];
          return forkJoin(
            toDelete.map((id) =>
              this.tasksApi.delete(id).pipe(catchError(() => of(null))),
            ),
          );
        }),
        switchMap(() => this.tasksApi.list()),
        finalize(() => this.deletingTaskId.set(null)),
      )
      .subscribe({
        next: (list) => {
          this.applyTaskList(list);
          void this.notify.success(
            reason === 'completed'
              ? 'Tarea marcada como realizada.'
              : 'Tarea eliminada.',
          );
        },
        error: () => {
          void this.notify.error('No se pudo eliminar la tarea.');
          this.reload();
        },
      });
  }

  private toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
