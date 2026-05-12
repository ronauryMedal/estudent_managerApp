import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  IonButton,
  IonContent,
  IonInput,
  IonSpinner,
  IonTextarea,
} from '@ionic/angular/standalone';
import { finalize } from 'rxjs/operators';

import { AuthService } from '../core/services/auth.service';
import { StudentCareerService } from '../core/services/student-career.service';

@Component({
  selector: 'app-setup-career',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonInput,
    IonTextarea,
    IonButton,
    IonSpinner,
  ],
  templateUrl: './setup-career.page.html',
  styleUrl: './setup-career.page.scss',
})
export class SetupCareerPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly careers = inject(StudentCareerService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly submitting = signal(false);
  readonly submittedAttempt = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    institution: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    /** Opcional en la práctica (p. ej. curso corto sin créditos formales). */
    totalCredits: [
      0,
      [Validators.required, Validators.min(0)],
    ],
    /** Cuatrimestres del plan; 1 si es un solo período. */
    totalSemester: [
      1,
      [Validators.required, Validators.min(1)],
    ],
    currentSemester: [1, [Validators.required, Validators.min(1), Validators.max(1)]],
  });

  ngOnInit(): void {
    this.applyCurrentSemesterBounds();
    this.form.controls.totalSemester.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyCurrentSemesterBounds());
  }

  /** Cuatrimestres del plan (mín. 1) para textos de ayuda y tope del actual. */
  effectivePlanQuarters(): number {
    const raw = this.form.controls.totalSemester.value;
    return Math.max(1, Math.floor(Number(raw)) || 1);
  }

  onTotalSemesterBlur(): void {
    this.applyCurrentSemesterBounds();
    this.onCurrentSemesterBlur();
  }

  /** Ajusta el cuatrimestre actual al rango [1, total del plan] al salir del campo. */
  onCurrentSemesterBlur(): void {
    const total = this.effectivePlanQuarters();
    const curCtrl = this.form.controls.currentSemester;
    const v = Math.floor(Number(curCtrl.value));
    if (!Number.isFinite(v)) {
      return;
    }
    const clamped = Math.min(Math.max(1, v), total);
    if (clamped !== v) {
      curCtrl.setValue(clamped);
    }
    curCtrl.updateValueAndValidity();
  }

  private applyCurrentSemesterBounds(): void {
    const total = this.effectivePlanQuarters();
    const curCtrl = this.form.controls.currentSemester;
    curCtrl.setValidators([
      Validators.required,
      Validators.min(1),
      Validators.max(total),
    ]);
    if (curCtrl.value > total) {
      curCtrl.setValue(total, { emitEvent: false });
    }
    curCtrl.updateValueAndValidity({ emitEvent: false });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  submit(): void {
    this.errorMessage.set(null);
    this.applyCurrentSemesterBounds();
    this.onCurrentSemesterBlur();

    if (this.form.invalid) {
      this.submittedAttempt.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const totalSemester = Math.max(
      1,
      Math.floor(Number(v.totalSemester)) || 1,
    );
    let currentSemester = Math.floor(Number(v.currentSemester));
    if (!Number.isFinite(currentSemester)) {
      currentSemester = 1;
    }
    currentSemester = Math.min(Math.max(1, currentSemester), totalSemester);

    this.submitting.set(true);
    this.careers
      .createMyCareer({
        name: v.name.trim(),
        institution: v.institution.trim(),
        description: v.description.trim() || undefined,
        totalCredits: Number(v.totalCredits),
        totalSemester,
        activate: true,
        currentSemester,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: async () => {
          await this.router.navigateByUrl('/tabs/tab1');
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 404) {
              this.errorMessage.set(
                'El servidor no tiene el endpoint de creación de carrera (POST /careers/me). Actualizá el backend o la URL en environment.',
              );
              return;
            }
            if (err.status === 401 || err.status === 403) {
              this.errorMessage.set(
                'No tenés permiso para crear el plan o la sesión expiró. Volvé a iniciar sesión.',
              );
              return;
            }
            if (err.status === 0) {
              this.errorMessage.set(
                'No hay conexión con el servidor. Comprobá que la API esté en marcha y la URL en environment.',
              );
              return;
            }
          }
          this.errorMessage.set(
            'No se pudo guardar. Revisa los datos o tu conexión e inténtalo de nuevo.',
          );
        },
      });
  }

  showError(controlName: 'name' | 'institution'): boolean {
    const c = this.form.controls[controlName];
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  showNumberError(controlName: 'totalCredits' | 'totalSemester' | 'currentSemester'): boolean {
    const c = this.form.controls[controlName];
    return c.invalid && (this.submittedAttempt() || c.touched);
  }
}
