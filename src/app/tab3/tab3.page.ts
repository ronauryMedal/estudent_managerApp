import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
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
  IonFab,
  IonFabButton,
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
  add,
  addCircleOutline,
  addOutline,
  bookOutline,
  calendarOutline,
  chevronForwardOutline,
  closeOutline,
  schoolOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';

import { Career } from '../core/models/career.model';
import {
  CreateMySubjectRequest,
  Subject,
  SubjectModality,
  SUBJECT_MODALITY_LABELS,
} from '../core/models/subject.model';
import { Teacher } from '../core/models/teacher.model';
import { AuthService } from '../core/services/auth.service';
import { StudentCareerService } from '../core/services/student-career.service';
import { StudentSubjectSchedulesService } from '../core/services/student-subject-schedules.service';
import { StudentSubjectTeachersService } from '../core/services/student-subject-teachers.service';
import {
  StudentSubjectsService,
  UserApprovedSubjectMine,
} from '../core/services/student-subjects.service';
import { StudentTeachersService } from '../core/services/student-teachers.service';
import { catchError, of, switchMap } from 'rxjs';
import {
  StudentAcademicRefs,
  studentAcademicRefs,
} from '../core/utils/student-academic-refs';
import { subjectPlanQuarter } from '../core/utils/subject-quarter';
import {
  SUBJECT_SCHEDULE_WEEKDAYS,
  SubjectSchedule,
  SubjectScheduleWeekday,
} from '../core/models/subject-schedule.model';
import {
  formatSubjectScheduleBlock,
  sortSubjectSchedules,
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
    IonFab,
    IonFabButton,
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
  private readonly teachersApi = inject(StudentTeachersService);
  private readonly subjectTeachersApi = inject(StudentSubjectTeachersService);
  private readonly schedulesApi = inject(StudentSubjectSchedulesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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
  readonly myTeachersList = signal<Teacher[]>([]);
  readonly academicRefs = signal<StudentAcademicRefs | null>(null);

  readonly detailSubject = signal<Subject | null>(null);
  readonly detailEnrollment = signal<UserApprovedSubjectMine | null>(null);
  readonly detailTeacherId = signal('');
  readonly detailSchedules = signal<SubjectSchedule[]>([]);
  readonly detailSchedulesLoading = signal(false);
  readonly showScheduleForm = signal(false);
  readonly scheduleSubmitting = signal(false);
  readonly scheduleDeletingId = signal<string | null>(null);
  readonly weekdayOptions = SUBJECT_SCHEDULE_WEEKDAYS;

  readonly createOpen = signal(false);
  readonly createSubmitting = signal(false);

  readonly createForm = this.fb.nonNullable.group({
    careerId: ['', Validators.required],
    quarterNumber: [1, [Validators.required, Validators.min(1)]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    credits: [4, [Validators.required, Validators.min(1)]],
    teacherId: [''],
    modality: ['VIRTUAL' as SubjectModality],
    building: [''],
    section: [''],
    courseNumber: [''],
  });

  readonly actionBusyId = signal<string | null>(null);

  readonly scheduleForm = this.fb.nonNullable.group(
    {
      weekday: ['MONDAY' as SubjectScheduleWeekday, Validators.required],
      startTime: ['08:00', Validators.required],
      endTime: ['10:00', Validators.required],
      room: [''],
    },
    { validators: (c) => Tab3Page.scheduleEndAfterStart(c) },
  );

  constructor() {
    addIcons({
      add,
      schoolOutline,
      bookOutline,
      addCircleOutline,
      addOutline,
      trashOutline,
      chevronForwardOutline,
      timeOutline,
      calendarOutline,
      closeOutline,
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

  teacherNamesLine(sub: Subject): string {
    const names =
      sub.teachers
        ?.map((st) => st.teacher?.name?.trim())
        .filter((n): n is string => !!n) ?? [];
    return names.length > 0 ? names.join(', ') : 'Sin profesor';
  }

  goToTeachers(): void {
    void this.router.navigateByUrl('/teachers');
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
    this.detailTeacherId.set('');
    this.detailSchedules.set(subject.schedules ?? []);
    this.showScheduleForm.set(false);
    this.scheduleForm.reset({
      weekday: 'MONDAY',
      startTime: '08:00',
      endTime: '10:00',
      room: '',
    });
    this.loadDetailSchedules(subject.id);
  }

  closeDetail(): void {
    this.detailSubject.set(null);
    this.detailEnrollment.set(null);
    this.detailSchedules.set([]);
    this.showScheduleForm.set(false);
    this.scheduleDeletingId.set(null);
  }

  sortedDetailSchedules(): SubjectSchedule[] {
    return sortSubjectSchedules(this.detailSchedules());
  }

  scheduleBlockLabel(block: SubjectSchedule): string {
    return formatSubjectScheduleBlock(block);
  }

  toggleScheduleForm(): void {
    this.showScheduleForm.update((v) => !v);
  }

  submitScheduleBlock(): void {
    const sub = this.detailSubject();
    if (!sub || this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }

    const v = this.scheduleForm.getRawValue();
    const room = v.room.trim();
    const body = {
      weekday: v.weekday,
      startTime: v.startTime,
      endTime: v.endTime,
      ...(room ? { room } : {}),
    };

    this.scheduleSubmitting.set(true);
    this.schedulesApi
      .create(sub.id, body)
      .pipe(finalize(() => this.scheduleSubmitting.set(false)))
      .subscribe({
        next: async (created) => {
          const next = sortSubjectSchedules([
            ...this.detailSchedules(),
            created,
          ]);
          this.patchSubjectSchedules(sub.id, next);
          this.showScheduleForm.set(false);
          this.scheduleForm.patchValue({
            weekday: 'MONDAY',
            startTime: '08:00',
            endTime: '10:00',
            room: '',
          });
          const t = await this.toast.create({
            message: 'Bloque horario añadido.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
        },
        error: async () => {
          const t = await this.toast.create({
            message:
              'No se pudo guardar el horario. Revisá día, horas y que la API esté actualizada.',
            duration: 4000,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  async confirmDeleteSchedule(block: SubjectSchedule): Promise<void> {
    const sub = this.detailSubject();
    const scheduleId = block.id;
    if (!sub?.id || !scheduleId) {
      return;
    }

    const a = await this.alert.create({
      header: 'Quitar bloque',
      message: `¿Eliminar «${this.scheduleBlockLabel(block)}»?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            this.deleteScheduleBlock(sub.id, scheduleId);
          },
        },
      ],
    });
    await a.present();
  }

  private deleteScheduleBlock(subjectId: string, scheduleId: string): void {
    this.scheduleDeletingId.set(scheduleId);
    this.schedulesApi
      .delete(subjectId, scheduleId)
      .pipe(finalize(() => this.scheduleDeletingId.set(null)))
      .subscribe({
        next: async () => {
          const next = this.detailSchedules().filter((b) => b.id !== scheduleId);
          this.patchSubjectSchedules(subjectId, next);
          const t = await this.toast.create({
            message: 'Bloque horario eliminado.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
        },
        error: async () => {
          const t = await this.toast.create({
            message: 'No se pudo eliminar el bloque.',
            duration: 2800,
            color: 'danger',
            position: 'bottom',
          });
          await t.present();
        },
      });
  }

  private loadDetailSchedules(subjectId: string): void {
    this.detailSchedulesLoading.set(true);
    this.schedulesApi
      .list(subjectId)
      .pipe(finalize(() => this.detailSchedulesLoading.set(false)))
      .subscribe({
        next: (list) => {
          const sorted = sortSubjectSchedules(list);
          this.detailSchedules.set(sorted);
          this.patchSubjectSchedules(subjectId, sorted);
        },
        error: () => {
          /* Mantener horarios embebidos en la materia si el GET falla. */
        },
      });
  }

  private patchSubjectSchedules(
    subjectId: string,
    schedules: SubjectSchedule[],
  ): void {
    this.detailSchedules.set(schedules);
    this.detailSubject.update((s) =>
      s?.id === subjectId ? { ...s, schedules } : s,
    );
    this.planSubjects.update((list) =>
      list.map((s) => (s.id === subjectId ? { ...s, schedules } : s)),
    );
    this.enrolledRows.update((rows) =>
      rows.map((r) =>
        r.subject.id === subjectId
          ? { ...r, subject: { ...r.subject, schedules } }
          : r,
      ),
    );
  }

  private static scheduleEndAfterStart(
    group: AbstractControl,
  ): ValidationErrors | null {
    const start = group.get('startTime')?.value as string | undefined;
    const end = group.get('endTime')?.value as string | undefined;
    if (!start || !end) {
      return null;
    }
    if (end <= start) {
      return { endBeforeStart: true };
    }
    return null;
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
      teacherId: '',
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
      myTeachers: this.teachersApi
        .getMyTeachers()
        .pipe(catchError(() => of([] as Teacher[]))),
    })
      .pipe(
        finalize(() => {
          this.loading.set(false);
          event?.target?.complete?.();
        }),
      )
      .subscribe({
        next: ({ plan, enrollments, myCareer, myCareers, myTeachers }) => {
          const refs = studentAcademicRefs(user, myCareer);
          this.academicRefs.set(refs);
          this.myCareersList.set(
            [...myCareers].sort((a, b) =>
              a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
            ),
          );
          this.myTeachersList.set(
            [...myTeachers].sort((a, b) =>
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

          const wantsCreate =
            this.route.snapshot.queryParamMap.get('create') === '1';
          if (wantsCreate) {
            void this.router.navigate([], {
              relativeTo: this.route,
              replaceUrl: true,
              queryParams: {},
            });
            queueMicrotask(() => this.openCreateModal());
          }
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

    const teacherId = v.teacherId?.trim() || '';

    this.createSubmitting.set(true);
    this.subjectsApi
      .createMySubject(body)
      .pipe(
        switchMap((created) => {
          if (!teacherId) {
            return of(created);
          }
          return this.subjectTeachersApi
            .linkMine({ subjectId: created.id, teacherId })
            .pipe(
              catchError(() => of(null)),
              switchMap((link) => of({ created, linkFailed: link === null })),
            );
        }),
        finalize(() => this.createSubmitting.set(false)),
      )
      .subscribe({
        next: async (result) => {
          const linkFailed =
            result && typeof result === 'object' && 'linkFailed' in result
              ? (result as { linkFailed: boolean }).linkFailed
              : false;
          let message = 'Materia creada en tu plan.';
          if (linkFailed) {
            message =
              'Materia creada, pero no se pudo enlazar el profesor. Probá desde el detalle de la materia.';
          } else if (teacherId) {
            message = 'Materia creada y profesor enlazado.';
          }
          const t = await this.toast.create({
            message,
            duration: 2800,
            color: linkFailed ? 'warning' : 'success',
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

  onDetailTeacherPick(ev: Event): void {
    const v = (ev as CustomEvent<{ value?: string }>).detail?.value;
    this.detailTeacherId.set(typeof v === 'string' ? v : '');
  }

  assignTeacherToDetail(): void {
    const sub = this.detailSubject();
    if (!sub) {
      return;
    }
    const teacherId = this.detailTeacherId();
    if (!teacherId) {
      void this.toast
        .create({
          message: 'Elegí un profesor de tu lista.',
          duration: 2200,
          color: 'warning',
          position: 'bottom',
        })
        .then((t) => t.present());
      return;
    }
    this.actionBusyId.set(sub.id);
    this.subjectTeachersApi
      .linkMine({ subjectId: sub.id, teacherId })
      .pipe(finalize(() => this.actionBusyId.set(null)))
      .subscribe({
        next: async () => {
          const t = await this.toast.create({
            message: 'Profesor enlazado a la materia.',
            duration: 2200,
            color: 'success',
            position: 'bottom',
          });
          await t.present();
          this.reload();
        },
        error: async () => {
          const t = await this.toast.create({
            message:
              'No se pudo enlazar. Usá un profesor que creaste en Profesores.',
            duration: 3600,
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
