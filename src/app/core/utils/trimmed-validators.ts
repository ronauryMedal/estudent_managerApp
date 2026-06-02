import { AbstractControl, ValidationErrors } from '@angular/forms';

/** `minLength` contando solo caracteres no vacíos al inicio/fin. */
export function trimmedMinLength(min: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const len = String(control.value ?? '').trim().length;
    return len >= min ? null : { trimmedMinLength: { requiredLength: min } };
  };
}
