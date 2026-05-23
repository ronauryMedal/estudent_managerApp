import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AlertController, ToastController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
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
  IonToolbar,
} from '@ionic/angular/standalone';
import { forkJoin, Subscription, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  add,
  calendarOutline,
  clipboardOutline,
  trashOutline,
} from 'ionicons/icons';

import { Subject } from '../core/models/subject.model';
import { Task } from '../core/models/task.model';
import { StudentSubjectsService } from '../core/services/student-subjects.service';
import { StudentTasksService } from '../core/services/student-tasks.service';
import { dedupeById } from '../core/utils/dedupe-by-id';
import { dedupeSubjects } from '../core/utils/dedupe-subjects';
import { openTasks, taskContentKey } from '../core/utils/dedupe-tasks';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  imports: [
    StudentMenuButtonsComponent,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
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
  private readonly alert = inject(AlertController);
  private readonly toast = inject(ToastController);
  private readonly destroyRef = inject(DestroyRef);

  private loadSub?: Subscription;
  private createSub?: Subscription;
  private deleteSub?: Subscription;

  readonly loading = signal(false);
  readonly createOpen = signal(false);
  readonly createSubmitting = signal(false);
  readonly deletingTaskId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly planSubjects = signal<Subject[]>([]);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    dueDate: ['', Validators.required],
    subjectId: ['', Validators.required],
  });

  constructor() {
    addIcons({ add, clipboardOutline, calendarOutline, trashOutline });
    this.destroyRef.onDestroy(() => {
      this.loadSub?.unsubscribe();
      this.createSub?.unsubscribe();
      this.deleteSub?.unsubscribe();
    });
  }

  ionViewWillEnter(): void {
    this.reload();
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

  taskTrackKey(task: Task): string {
    return taskContentKey(task);
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
      void this.toast
        .create({
          message:
            'Creá al menos una materia en la pestaña Materias para enlazar tareas.',
          duration: 3600,
          color: 'warning',
          position: 'bottom',
        })
        .then((t) => t.present());
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
      void this.toast
        .create({
          message: 'La fecha de entrega no es válida.',
          duration: 2600,
          color: 'warning',
          position: 'bottom',
        })
        .then((t) => t.present());
      return;
    }

    const body = {
      title: v.title.trim(),
      description: v.description.trim() || undefined,
      dueDate: due.toISOString(),
      subjectId: v.subjectId,
    };

    this.createSub?.unsubscribe();
    this.createSubmitting.set(true);
    this.createSub = this.tasksApi
      .create(body)
      .pipe(
        switchMap(() => this.tasksApi.list()),
        finalize(() => {
          this.createSubmitting.set(false);
          this.createSub = undefined;
        }),
      )
      .subscribe({
        next: async (list) => {
          this.applyTaskList(list);
          const t = await this.toast.create({
            message: 'Tarea creada.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
          this.closeCreateModal();
        },
        error: async () => {
          const t = await this.toast.create({
            message: 'No se pudo crear la tarea.',
            duration: 3200,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  async confirmDelete(task: Task): Promise<void> {
    if (this.deletingTaskId()) {
      return;
    }

    const alert = await this.alert.create({
      header: 'Eliminar tarea',
      message: `¿Eliminar «${task.title}»?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    if (role === 'destructive') {
      this.deleteTask(task);
    }
  }

  private applyTaskList(list: Task[]): void {
    this.tasks.set(openTasks(dedupeById(list)));
  }

  private deleteTask(task: Task): void {
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
          const ids = [
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
        next: async (list) => {
          this.applyTaskList(list);
          const t = await this.toast.create({
            message: 'Tarea eliminada.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
        },
        error: async () => {
          const t = await this.toast.create({
            message: 'No se pudo eliminar la tarea.',
            duration: 2800,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
          this.reload();
        },
      });
  }

  private toDatetimeLocalValue(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
