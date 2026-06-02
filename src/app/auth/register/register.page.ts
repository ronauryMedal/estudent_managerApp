import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';
import { httpErrorMessage } from '../../core/utils/api-error-message';
import { trimmedMinLength } from '../../core/utils/trimmed-validators';

/** Mínimo exigido por el API (`POST /auth/register`). */
const PASSWORD_MIN_LENGTH = 8;

function passwordsMatch(
  control: AbstractControl,
): ValidationErrors | null {
  const password = control.get('password')?.value as string | undefined;
  const confirm = control.get('confirmPassword')?.value as string | undefined;
  if (password === undefined || confirm === undefined) {
    return null;
  }
  if (password !== confirm) {
    return { passwordsMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonInput,
    IonButton,
  ],
  templateUrl: './register.page.html',
  styleUrl: './register.page.scss',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly submittedAttempt = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, trimmedMinLength(2)]],
      lastName: ['', [Validators.required, trimmedMinLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.submittedAttempt.set(true);
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const name = `${v.firstName.trim()} ${v.lastName.trim()}`.trim();
    if (name.length < 2) {
      this.submittedAttempt.set(true);
      this.errorMessage.set(
        'Introduce nombre y apellido válidos (mínimo 2 letras cada uno).',
      );
      return;
    }

    this.submitting.set(true);

    this.auth
      .register({
        name,
        email: v.email.trim().toLowerCase(),
        password: v.password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/setup-career');
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(this.registerErrorMessage(err));
        },
      });
  }

  showFirstNameError(): boolean {
    const c = this.form.controls.firstName;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  showLastNameError(): boolean {
    const c = this.form.controls.lastName;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  showEmailError(): boolean {
    const c = this.form.controls.email;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  showPasswordError(): boolean {
    const c = this.form.controls.password;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  showConfirmError(): boolean {
    const c = this.form.controls.confirmPassword;
    return c.invalid && (this.submittedAttempt() || c.touched);
  }

  private registerErrorMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse && err.status === 409) {
      return 'Ese correo ya está registrado. Probá iniciar sesión.';
    }
    return httpErrorMessage(
      err,
      'No se pudo crear la cuenta. Inténtalo de nuevo.',
    );
  }

  showPasswordMismatch(): boolean {
    const mismatch = this.form.errors?.['passwordsMismatch'] === true;
    if (!mismatch) {
      return false;
    }
    const confirm = this.form.controls.confirmPassword;
    return (
      this.submittedAttempt() ||
      (confirm.touched && (confirm.dirty || this.form.controls.password.touched))
    );
  }
}
