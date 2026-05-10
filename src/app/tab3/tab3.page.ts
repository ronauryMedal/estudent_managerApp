import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { forkJoin, Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  bookOutline,
  chevronForwardOutline,
  schoolOutline,
  trashOutline,
} from 'ionicons/icons';

import { Career } from '../core/models/career.model';
import {
  CreateMySubjectRequest,
  Subject,
  SubjectModality,
  SUBJECT_MODALITY_LABELS,
} from '../core/models/subject.model';
import { AuthService } from '../core/services/auth.service';
import { StudentCareerService } from '../core/services/student-career.service';
import {
  StudentSubjectsService,
  UserApprovedSubjectMine,
} from '../core/services/student-subjects.service';
import {
  StudentAcademicRefs,
  studentAcademicRefs,
} from '../core/utils/student-academic-refs';
import { subjectPlanQuarter } from '../core/utils/subject-quarter';
import {
  subjectCourseDetailLine,
  subjectScheduleLines,
} from '../core/utils/subject-schedule-display';
import { StudentMenuButtonsComponent } from '../shared/student-menu-buttons.component';

export interface EnrolledSubjectRow {
  enrollment: UserApprovedSubjectMine;
  subject: Subject;
}

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  imports: [
    StudentMenuButtonsComponent,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonModal,
    IonButtons,
    IonInput,
    IonSelect,
    IonSelectOption,
  ],
})
export class Tab3Page {
  readonly auth = inject(AuthService);
  private readonly subjectsApi = inject(StudentSubjectsService);
  private readonly careersApi = inject(StudentCareerService);
  private readonly toast = inject(ToastController);
  private readonly alert = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private loadSub?: Subscription;

  readonly segment = signal<'plan' | 'approved'>('plan');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly planSubjects = signal<Subject[]>([]);
  readonly enrolledRows = signal<EnrolledSubjectRow[]>([]);
  readonly myCareersList = signal<Career[]>([]);
  readonly academicRefs = signal<StudentAcademicRefs | null>(null);

  readonly detailSubject = signal<Subject | null>(null);
  readonly detailEnrollment = signal<UserApprovedSubjectMine | null>(null);

  readonly createOpen = signal(false);
  readonly createSubmitting = signal(false);

  readonly createForm = this.fb.nonNullable.group({
    careerId: ['', Validators.required],
    quarterNumber: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    credits: [4, [Validators.required, Validators.min(1)]],
    modality: ['VIRTUAL' as SubjectModality],
    building: [''],
    section: [''],
    courseNumber: [''],
  });

  readonly actionBusyId = signal<string | null>(null);

  constructor() {
    addIcons({
      schoolOutline,
      bookOutline,
      addCircleOutline,
      trashOutline,
      chevronForwardOutline,
    });
    this.destroyRef.onDestroy(() => this.loadSub?.unsubscribe());

    this.createForm
      .get('modality')!
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncPresenceValidators());
    this.syncPresenceValidators();
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  segmentChange(ev: Event): void {
    const v = (ev as CustomEvent<{ value: string }>).detail?.value;
    if (v === 'plan' || v === 'approved') {
      this.segment.set(v);
    }
  }

  planQuarter(sub: Subject): number {
    return subjectPlanQuarter(sub);
  }

  careerLabel(careerId: string): string {
    return this.myCareersList().find((c) => c.id === careerId)?.name ?? '—';
  }

  modalityLabel(sub: Subject): string {
    const m = sub.modality;
    return m && m in SUBJECT_MODALITY_LABELS
      ? SUBJECT_MODALITY_LABELS[m as SubjectModality]
      : '—';
  }

  scheduleLines(sub: Subject): string[] {
    return subjectScheduleLines(sub);
  }

  courseLine(sub: Subject): string | null {
    return subjectCourseDetailLine(sub);
  }

  openDetail(
    subject: Subject,
    enrollment: UserApprovedSubjectMine | null = null,
  ): void {
    this.detailSubject.set(subject);
    this.detailEnrollment.set(enrollment);
  }

  closeDetail(): void {
    this.detailSubject.set(null);
    this.detailEnrollment.set(null);
  }

  openCreateModal(): void {
    if (this.myCareersList().length === 0) {
      void this.toast
        .create({
          message:
            'Crea primero una carrera en tu plan (API: POST /careers/me) para poder añadir materias.',
          duration: 3800,
          color: 'warning',
          position: 'bottom',
        })
        .then((t) => t.present());
      return;
    }
    const first = this.myCareersList()[0]!.id;
    this.createForm.patchValue({
      careerId: this.createForm.get('careerId')!.value || first,
      quarterNumber: 1,
      name: '',
      credits: 4,
      modality: 'VIRTUAL',
      building: '',
      section: '',
      courseNumber: '',
    });
    this.syncPresenceValidators();
    this.createOpen.set(true);
  }

  closeCreateModal(): void {
    this.createOpen.set(false);
  }

  formatApprovedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    return d.toLocaleString('es', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  reload(event?: { target?: { complete?: () => void } }): void {
    const user = this.auth.currentUser();
    if (!user) {
      this.errorMessage.set('No hay sesión.');
      event?.target?.complete?.();
      return;
    }

    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.loadSub = forkJoin({
      plan: this.subjectsApi.getMyPlanSubjects(),
      enrollments: this.subjectsApi.getMyEnrollments(),
      myCareer: this.subjectsApi.getMyCareer(),
      myCareers: this.careersApi.getMyCareers(),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          event?.target?.complete?.();
        }),
      )
      .subscribe({
        next: ({ plan, enrollments, myCareer, myCareers }) => {
          const refs = studentAcademicRefs(user, myCareer);
          this.academicRefs.set(refs);
          this.myCareersList.set(
            [...myCareers].sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            ),
          );

          const sortedPlan = [...plan].sort((a, b) =>
            a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
          );
          this.planSubjects.set(sortedPlan);

          const byId = new Map(sortedPlan.map((s) => [s.id, s]));
          const rows: EnrolledSubjectRow[] = [];
          for (const e of enrollments) {
            const sub = e.subject ?? byId.get(e.subjectId);
            if (!sub) {
              continue;
            }
            rows.push({ enrollment: e, subject: sub });
          }
          rows.sort((a, b) =>
            a.subject.name.localeCompare(b.subject.name, 'es', {
              sensitivity: 'base',
            }),
          );
          this.enrolledRows.set(rows);
        },
        error: () => {
          this.errorMessage.set(
            'No se pudieron cargar las materias. Intenta de nuevo.',
          );
        },
      });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const v = this.createForm.getRawValue();
    const quarterNumber = Number(v.quarterNumber);
    const credits = Number(v.credits);
    const body: CreateMySubjectRequest = {
      careerId: v.careerId,
      quarterNumber,
      name: v.name.trim(),
      credits,
      modality: v.modality,
    };
    if (v.modality === 'IN_PERSON' || v.modality === 'HYBRID') {
      body.building = v.building.trim();
      body.section = v.section.trim();
      body.courseNumber = v.courseNumber.trim();
    }

    this.createSubmitting.set(true);
    this.subjectsApi
      .createMySubject(body)
      .pipe(finalize(() => this.createSubmitting.set(false)))
      .subscribe({
        next: async () => {
          const t = await this.toast.create({
            message: 'Materia creada en tu plan.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
          this.closeCreateModal();
          this.reload();
        },
        error: async () => {
          const t = await this.toast.create({
            message:
              'No se pudo crear la materia. El careerId debe ser una carrera que tú creaste.',
            duration: 4000,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  async enrollSubject(subjectId: string): Promise<void> {
    this.actionBusyId.set(subjectId);
    this.subjectsApi
      .enroll({ subjectId })
      .pipe(finalize(() => this.actionBusyId.set(null)))
      .subscribe({
        next: async () => {
          const t = await this.toast.create({
            message: 'Materia añadida a tu avance.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
          this.closeDetail();
          this.reload();
        },
        error: async () => {
          const t = await this.toast.create({
            message:
              'No se pudo registrar. La materia debe existir en tu plan y no estar ya en tu lista.',
            duration: 3600,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  async confirmUnenroll(row: EnrolledSubjectRow): Promise<void> {
    const a = await this.alert.create({
      header: 'Quitar materia',
      message: `¿Dejar de cursar «${row.subject.name}»?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Quitar',
          role: 'destructive',
          handler: () => {
            this.unenroll(row.enrollment.id);
          },
        },
      ],
    });
    await a.present();
  }

  private unenroll(enrollmentId: string): void {
    this.actionBusyId.set(enrollmentId);
    this.subjectsApi
      .unenroll(enrollmentId)
      .pipe(finalize(() => this.actionBusyId.set(null)))
      .subscribe({
        next: async () => {
          const t = await this.toast.create({
            message: 'Materia quitada de tu lista.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
          this.closeDetail();
          this.reload();
        },
        error: async () => {
          const t = await this.toast.create({
            message: 'No se pudo quitar la materia.',
            duration: 2800,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  private syncPresenceValidators(): void {
    const modality = this.createForm.get('modality')!
      .value as SubjectModality;
    const need = modality === 'IN_PERSON' || modality === 'HYBRID';
    for (const key of ['building', 'section', 'courseNumber'] as const) {
      const c = this.createForm.get(key)!;
      if (need) {
        c.setValidators([Validators.required, Validators.minLength(1)]);
      } else {
        c.clearValidators();
      }
      c.updateValueAndValidity({ emitEvent: false });
    }
  }
}
