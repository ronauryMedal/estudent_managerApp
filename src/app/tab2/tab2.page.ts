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
  IonRange,
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
  checkmarkCircleOutline,
  checkmarkDoneOutline,
  clipboardOutline,
  closeCircleOutline,
  cloudUploadOutline,
  documentTextOutline,
  easelOutline,
  helpCircleOutline,
  libraryOutline,
  optionsOutline,
  sparklesOutline,
  trashOutline,
} from 'ionicons/icons';

import { Subject } from '../core/models/subject.model';
import {
  AiResearchOptions,
  CreateTaskRequest,
  Task,
} from '../core/models/task.model';
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
  taskCompletedNotifyContent,
  taskCreateNotifyContent,
  taskDeletedNotifyContent,
  taskSyncedNotifyContent,
} from '../core/utils/task-action-notify-messages';
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
    IonRange,
  ],
})
export class Tab2Page {
  /** Límites alineados con `AI_RESEARCH_*` del backend. */
  static readonly AI_MIN_PAGES = 3;
  static readonly AI_MAX_PAGES = 15;
  static readonly AI_MIN_SLIDES = 5;
  static readonly AI_MAX_SLIDES = 20;
  static readonly AI_SOURCE_PDF_MAX_MB = 15;

  readonly aiMinPages = Tab2Page.AI_MIN_PAGES;
  readonly aiMaxPages = Tab2Page.AI_MAX_PAGES;
  readonly aiMinSlides = Tab2Page.AI_MIN_SLIDES;
  readonly aiMaxSlides = Tab2Page.AI_MAX_SLIDES;
  readonly aiSourcePdfMaxMb = Tab2Page.AI_SOURCE_PDF_MAX_MB;
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
  readonly bookPdfFile = signal<File | null>(null);
  readonly questionnairePdfFile = signal<File | null>(null);
  readonly aiPdfModeHint = computed(() =>
    this.describeAiPdfMode(this.bookPdfFile(), this.questionnairePdfFile()),
  );
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
    advancedMode: [false],
    targetPages: [
      8,
      [
        Validators.min(Tab2Page.AI_MIN_PAGES),
        Validators.max(Tab2Page.AI_MAX_PAGES),
      ],
    ],
    focusNotes: ['', Validators.maxLength(800)],
    forPresentation: [false],
    presentationSlides: [
      10,
      [
        Validators.min(Tab2Page.AI_MIN_SLIDES),
        Validators.max(Tab2Page.AI_MAX_SLIDES),
      ],
    ],
  });

  constructor() {
    addIcons({
      add,
      bookOutline,
      clipboardOutline,
      calendarOutline,
      checkmarkCircleOutline,
      checkmarkDoneOutline,
      closeCircleOutline,
      cloudUploadOutline,
      documentTextOutline,
      easelOutline,
      helpCircleOutline,
      libraryOutline,
      optionsOutline,
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
      advancedMode: false,
      targetPages: 8,
      focusNotes: '',
      forPresentation: false,
      presentationSlides: 10,
    });
    this.resetAiPdfFiles();
    this.createOpen.set(true);
  }

  onAiResearchToggle(enabled: boolean): void {
    if (!enabled) {
      this.form.patchValue({
        advancedMode: false,
        forPresentation: false,
      });
      this.resetAiPdfFiles();
    }
  }

  onAdvancedModeToggle(enabled: boolean): void {
    if (!enabled) {
      this.form.patchValue({ forPresentation: false });
    }
  }

  closeCreateModal(): void {
    this.createOpen.set(false);
    this.resetAiPdfFiles();
  }

  onBookPdfSelected(event: Event): void {
    this.assignPdfFile(event, 'book');
  }

  onQuestionnairePdfSelected(event: Event): void {
    this.assignPdfFile(event, 'questionnaire');
  }

  clearBookPdf(): void {
    this.bookPdfFile.set(null);
  }

  clearQuestionnairePdf(): void {
    this.questionnairePdfFile.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  aiResearchStatusLabel(task: Task): string | null {
    const status = task.aiResearch?.status;
    if (status === 'PENDING') {
      return 'IA en cola';
    }
    if (status === 'PROCESSING') {
      return 'Generando IA…';
    }
    if (status === 'FAILED') {
      return 'IA falló';
    }
    return null;
  }

  aiResearchStatusTone(task: Task): string {
    const status = task.aiResearch?.status;
    if (status === 'FAILED') {
      return 'danger';
    }
    if (status === 'PROCESSING') {
      return 'warning';
    }
    return 'primary';
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

    const pdfFiles = {
      bookPdf: this.bookPdfFile() ?? undefined,
      questionnairePdf: this.questionnairePdfFile() ?? undefined,
    };
    const hasPdfs = !!(pdfFiles.bookPdf || pdfFiles.questionnairePdf);

    if (hasPdfs && !this.isOnline()) {
      void this.notify.warning(
        'Subir PDFs para la investigación IA requiere conexión a internet.',
        'Sin conexión',
      );
      return;
    }

    if (!this.isOnline() && v.generateAiResearch) {
      void this.notify.info(
        'Sin conexión: la tarea se guardará en el dispositivo. La investigación con IA y el correo se procesarán al sincronizar.',
        'Modo sin conexión',
        4800,
      );
    }

    const aiResearchOptions = v.generateAiResearch
      ? this.buildAiResearchOptions(v, pdfFiles)
      : undefined;

    const body: CreateTaskRequest = {
      title: v.title.trim(),
      description: v.description.trim() || undefined,
      dueDate: due.toISOString(),
      subjectId: v.subjectId,
      generateAiResearch: v.generateAiResearch,
      ...(aiResearchOptions && !hasPdfs ? { aiResearchOptions } : {}),
    };

    const aiExtras =
      v.generateAiResearch && hasPdfs && aiResearchOptions
        ? { pdfFiles, aiResearchOptions }
        : undefined;

    this.createSub?.unsubscribe();
    this.createSubmitting.set(true);
    let createdOffline = false;
    this.createSub = this.tasksApi
      .create(body, aiExtras)
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
          const toast = taskCreateNotifyContent({
            title: v.title,
            generateAiResearch: v.generateAiResearch,
            advancedMode: v.advancedMode,
            forPresentation: v.forPresentation,
            targetPages: v.targetPages,
            presentationSlides: v.presentationSlides,
            hasBookPdf: !!pdfFiles.bookPdf,
            hasQuestionnairePdf: !!pdfFiles.questionnairePdf,
            offline: createdOffline,
          });
          void this.notify.success(
            toast.message,
            toast.header,
            toast.duration,
          );
          this.resetAiPdfFiles();
          this.closeCreateModal();
        },
        error: (err: unknown) => {
          void this.notify.errorFromHttp(
            err,
            'No se pudo crear la tarea.',
          );
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

  async confirmCompleteTask(task: Task): Promise<void> {
    if (this.completingTaskId() || this.deletingTaskId()) {
      return;
    }

    if (!this.isOnline() && !this.isPendingTask(task)) {
      void this.notify.warning(
        'Necesitás conexión para marcar esta tarea como realizada.',
      );
      return;
    }

    const ok = await this.notify.confirm({
      header: '¿Terminaste la tarea?',
      message: `¿Confirmás que ya terminaste «${task.title}»? Pasará a Realizadas y no recibirás más recordatorios.`,
      confirmText: 'Sí, la terminé',
      cancelText: 'Todavía no',
      overModal: true,
    });
    if (ok) {
      this.markTaskCompleted(task);
    }
  }

  private markTaskCompleted(task: Task): void {
    if (this.completingTaskId() || this.deletingTaskId()) {
      return;
    }

    if (this.isPendingTask(task)) {
      this.deleteTask(task, 'completed');
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
          const toast = taskCompletedNotifyContent(task.title);
          void this.notify.success(
            toast.message,
            toast.header,
            toast.duration,
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
    const pendingBefore = this.pendingCreateCount();
    this.syncSub = this.tasksApi.syncPendingCreates().subscribe({
      next: (list) => {
        this.applyTaskList(list);
        const synced = Math.max(0, pendingBefore - this.pendingCreateCount());
        if (synced > 0) {
          const toast = taskSyncedNotifyContent(synced);
          void this.notify.success(
            toast.message,
            toast.header,
            toast.duration,
          );
        }
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
          const toast =
            reason === 'completed'
              ? taskCompletedNotifyContent(task.title)
              : taskDeletedNotifyContent(task.title);
          void this.notify.success(
            toast.message,
            toast.header,
            toast.duration,
          );
        },
        error: () => {
          void this.notify.error('No se pudo eliminar la tarea.');
          this.reload();
        },
      });
  }

  private buildAiResearchOptions(
    v: ReturnType<typeof this.form.getRawValue>,
    pdfFiles: { bookPdf?: File; questionnairePdf?: File },
  ): AiResearchOptions | undefined {
    if (!v.generateAiResearch) {
      return undefined;
    }

    const hasBook = !!pdfFiles.bookPdf;
    const hasQuestionnaire = !!pdfFiles.questionnairePdf;

    if (!hasBook && !hasQuestionnaire && !v.advancedMode) {
      return undefined;
    }

    const options: AiResearchOptions = {
      validateDocumentTypes: true,
    };

    if (hasBook && hasQuestionnaire) {
      options.questionnaireMode = true;
    } else if (hasQuestionnaire) {
      options.questionnaireMode = true;
      options.useWebResearch = true;
    } else if (hasBook) {
      options.basedOnUploadedPdf = true;
    }

    if (v.advancedMode) {
      options.advancedMode = true;
      options.targetPages = this.clamp(
        v.targetPages,
        Tab2Page.AI_MIN_PAGES,
        Tab2Page.AI_MAX_PAGES,
      );

      if (v.forPresentation) {
        options.forPresentation = true;
        options.presentationSlides = this.clamp(
          v.presentationSlides,
          Tab2Page.AI_MIN_SLIDES,
          Tab2Page.AI_MAX_SLIDES,
        );
      }
    }

    const notes = v.focusNotes.trim();
    if (notes) {
      options.focusNotes = notes;
    }

    return options;
  }

  private assignPdfFile(
    event: Event,
    kind: 'book' | 'questionnaire',
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf') {
      void this.notify.warning('Solo se admiten archivos PDF.');
      input.value = '';
      return;
    }

    const maxBytes = Tab2Page.AI_SOURCE_PDF_MAX_MB * 1024 * 1024;
    if (file.size > maxBytes) {
      void this.notify.warning(
        `El PDF supera el límite de ${Tab2Page.AI_SOURCE_PDF_MAX_MB} MB.`,
      );
      input.value = '';
      return;
    }

    if (kind === 'book') {
      this.bookPdfFile.set(file);
    } else {
      this.questionnairePdfFile.set(file);
    }
  }

  private resetAiPdfFiles(): void {
    this.bookPdfFile.set(null);
    this.questionnairePdfFile.set(null);
  }

  private describeAiPdfMode(
    book: File | null,
    questionnaire: File | null,
  ): string | null {
    if (book && questionnaire) {
      return 'Libro + cuestionario: respuestas solo con tu material (sin internet).';
    }
    if (questionnaire) {
      return 'Solo cuestionario: la IA buscará respuestas en internet (Google Search).';
    }
    if (book) {
      return 'Solo libro: investigación o resumen basado en tu PDF.';
    }
    return null;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, Math.round(value)));
  }

  private toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
