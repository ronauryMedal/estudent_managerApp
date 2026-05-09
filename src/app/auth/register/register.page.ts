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
  IonBackButton,
  IonButton,
  IonContent,
  IonInput,
} from '@ionic/angular/standalone';

import { AuthService } from '../../core/services/auth.service';

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
    IonBackButton,
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
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
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

    this.submitting.set(true);
    const v = this.form.getRawValue();
    const name = `${v.firstName.trim()} ${v.lastName.trim()}`.trim();

    this.auth
      .register({
        name,
        email: v.email.trim(),
        password: v.password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          void this.router.navigateByUrl('/');
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set(
            'No se pudo crear la cuenta. Inténtalo de nuevo.',
          );
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
