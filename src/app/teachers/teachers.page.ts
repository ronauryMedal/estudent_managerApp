import { Component, inject, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
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
} from 'ionicons/icons';
import { finalize } from 'rxjs/operators';

import { Teacher } from '../core/models/teacher.model';
import { StudentTeachersService } from '../core/services/student-teachers.service';
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
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastController);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly teachers = signal<Teacher[]>([]);
  readonly submittedAttempt = signal(false);
  readonly createOpen = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
  });

  constructor() {
    addIcons({ add, peopleOutline, mailOutline, libraryOutline });
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
    this.loading.set(true);
    this.errorMessage.set(null);
    this.api
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
            [...list].sort((a, b) =>
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
        next: async (created) => {
          this.teachers.update((list) =>
            [...list, created].sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            ),
          );
          this.closeCreateModal();
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
}
