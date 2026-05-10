import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { StudentCareerService } from '../services/student-career.service';

function isAdmin(user: User | null): boolean {
  return user?.role === 'ADMIN';
}

/**
 * Estudiante sin carrera propia no puede entrar al resto de la app;
 * se redirige a `/setup-career`. Los administradores pasan siempre.
 */
export const studentCareerRequiredGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const careersApi = inject(StudentCareerService);

  const user = auth.currentUser();
  if (isAdmin(user)) {
    return true;
  }

  return careersApi.getMyCareers().pipe(
    map((list) =>
      list.length > 0 ? true : router.createUrlTree(['/setup-career']),
    ),
    catchError(() => of(router.createUrlTree(['/setup-career']))),
  );
};

/**
 * La pantalla de alta inicial solo aplica si aún no tenés carreras creadas;
 * si ya hay plan, va al inicio de las pestañas.
 */
export const studentSetupCareerPageGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const careersApi = inject(StudentCareerService);

  const user = auth.currentUser();
  if (isAdmin(user)) {
    return router.createUrlTree(['/tabs', 'tab1']);
  }

  return careersApi.getMyCareers().pipe(
    map((list) =>
      list.length === 0
        ? true
        : router.createUrlTree(['/tabs', 'tab1']),
    ),
    catchError(() => of(true)),
  );
};
