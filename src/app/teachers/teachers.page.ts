import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom, Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  libraryOutline,
  mailOutline,
  peopleOutline,
  trashOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs/operators';

import { Teacher } from '../core/models/teacher.model';
import { StudentSubjectTeachersService } from '../core/services/student-subject-teachers.service';
import { StudentTeachersService } from '../core/services/student-teachers.service';
import { dedupeById } from '../core/utils/dedupe-by-id';
import { dedupeTeachers } from '../core/utils/dedupe-teachers';
import { userInitials } from '../core/utils/user-initials';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';

@Component({
  selector: 'app-teachers',
  standalone: true,
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
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonFab,
    IonFabButton,
  ],
  templateUrl: './teachers.page.html',
  styleUrl: './teachers.page.scss',
})
export class TeachersPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(StudentTeachersService);
  private readonly subjectTeachers = inject(StudentSubjectTeachersService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);
  private loadSub?: Subscription;
  private deleteSub?: Subscription;

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly deletingTeacherId = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly teachers = signal<Teacher[]>([]);
  readonly submittedAttempt = signal(false);
  readonly createOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
  });

  constructor() {
    addIcons({
      add,
      peopleOutline,
      mailOutline,
      libraryOutline,
      trashOutline,
    });
    this.destroyRef.onDestroy(() => {
      this.loadSub?.unsubscribe();
      this.deleteSub?.unsubscribe();
    });
  }

  ionViewWillEnter(): void {
    const openModalAfterLoad =
      this.route.snapshot.queryParamMap.get('create') === '1';
    if (openModalAfterLoad) {
      void this.router.navigate([], {
        relativeTo: this.route,
        replaceUrl: true,
        queryParams: {},
      });
    }
    this.load(undefined, openModalAfterLoad);
  }

  teacherCount(): number {
    return this.teachers().length;
  }

  initials(name: string): string {
    return userInitials(name);
  }

  load(
    event?: { target?: { complete?: () => void } },
    openModalAfter = false,
  ): void {
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);
    this.loadSub = this.api
      .getMyTeachers()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          event?.target?.complete?.();
        }),
      )
      .subscribe({
        next: (list) => {
          this.teachers.set(
            dedupeTeachers(dedupeById(list)).sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            ),
          );
          if (openModalAfter) {
            queueMicrotask(() => this.openCreateModal());
          }
        },
        error: () => {
          this.errorMessage.set(
            'No se pudieron cargar tus profesores. Revisá la conexión o el servidor.',
          );
        },
      });
  }

  openCreateModal(): void {
    this.form.reset({ name: '', email: '' });
    this.submittedAttempt.set(false);
    this.createOpen.set(true);
  }

  closeCreateModal(): void {
    this.createOpen.set(false);
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.submittedAttempt.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const email = v.email.trim();

    this.submitting.set(true);
    this.api
      .createMyTeacher({
        name: v.name.trim(),
        email: email || undefined,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: async () => {
          this.closeCreateModal();
          this.load();
          const t = await this.toast.create({
            message: 'Profesor guardado.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
        },
        error: async () => {
          const t = await this.toast.create({
            message: 'No se pudo crear el profesor.',
            duration: 3200,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  showNameError(): boolean {
    const c = this.form.controls.name;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  goToSubjects(): void {
    void this.router.navigateByUrl('/tabs/tab3');
  }

  async confirmDelete(teacher: Teacher): Promise<void> {
    if (this.deletingTeacherId()) {
      return;
    }

    const links = await firstValueFrom(
      this.subjectTeachers
        .getMyLinks()
        .pipe(catchError(() => of([]))),
    );
    const assignmentCount = links.filter(
      (l) => l.teacherId === teacher.id,
    ).length;

    if (assignmentCount > 0) {
      const blocked = await this.alert.create({
        header: 'No se puede eliminar',
        cssClass: 'alert-over-modal',
        message:
          assignmentCount === 1
            ? `«${teacher.name}» está asignado a una materia. Primero desasignalo desde la pestaña Materias (abrí la materia y cambiá o quitá el profesor). Después podés eliminarlo acá.`
            : `«${teacher.name}» está asignado a ${assignmentCount} materias. Primero desasignalo en cada materia desde la pestaña Materias. Después podés eliminarlo acá.`,
        buttons: [
          { text: 'Cerrar', role: 'cancel' },
          {
            text: 'Ir a Materias',
            handler: () => {
              this.goToSubjects();
            },
          },
        ],
      });
      await blocked.present();
      return;
    }

    const teacherId = teacher.id;
    const alert = await this.alert.create({
      header: 'Eliminar profesor',
      cssClass: 'alert-over-modal',
      message: `¿Eliminar a «${teacher.name}»? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.deleteTeacher(teacherId);
          },
        },
      ],
    });
    await alert.present();
  }

  private deleteTeacher(teacherId: string): void {
    if (this.deletingTeacherId() === teacherId) {
      return;
    }

    this.deleteSub?.unsubscribe();
    this.deletingTeacherId.set(teacherId);
    this.deleteSub = this.api
      .deleteMyTeacher(teacherId)
      .pipe(finalize(() => this.deletingTeacherId.set(null)))
      .subscribe({
        next: async () => {
          this.teachers.update((list) =>
            list.filter((t) => t.id !== teacherId),
          );
          const t = await this.toast.create({
            message: 'Profesor eliminado.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
        },
        error: async (err: HttpErrorResponse) => {
          if (err.status === 409) {
            await this.showTeacherAssignedAlert(
              TeachersPage.apiErrorMessage(err),
            );
            return;
          }
          const t = await this.toast.create({
            message:
              err.status === 403
                ? 'Solo podés eliminar profesores que vos creaste.'
                : 'No se pudo eliminar el profesor.',
            duration: 3200,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  private async showTeacherAssignedAlert(message: string): Promise<void> {
    const alert = await this.alert.create({
      header: 'Profesor en uso',
      cssClass: 'alert-over-modal',
      message,
      buttons: [
        { text: 'Cerrar', role: 'cancel' },
        {
          text: 'Ir a Materias',
          handler: () => {
            this.goToSubjects();
          },
        },
      ],
    });
    await alert.present();
  }

  private static apiErrorMessage(err: HttpErrorResponse): string {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (
      typeof body === 'object' &&
      body &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
    if (Array.isArray(body?.message)) {
      return body.message.join(' ');
    }
    return 'No podés eliminar este profesor porque está asignado a una o más materias. Desasignalo primero desde Materias.';
  }
}
