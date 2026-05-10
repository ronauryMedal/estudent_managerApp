import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY, apiOrigin } from '../auth-storage';
import { AuthService } from '../services/auth.service';

const AUTH_LOGIN = '/auth/login';
const AUTH_REGISTER = '/auth/register';

/**
 * Añade `Authorization: Bearer` a las peticiones contra `environment.apiUrl`
 * (excepto login/register). Ante 401 en rutas protegidas, cierra sesión y va a login.
 */
export const apiAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const apiBase = apiOrigin(environment.apiUrl);
  const isOurApi = req.url.startsWith(apiBase);
  const isPublicAuth =
    req.url.includes(AUTH_LOGIN) || req.url.includes(AUTH_REGISTER);

  let outgoing = req;
  if (isOurApi && !isPublicAuth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      outgoing = req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      });
    }
  }

  return next(outgoing).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && isOurApi && !isPublicAuth) {
        const auth = injector.get(AuthService);
        auth.logout();
        void injector.get(Router).navigate(['/login']);
      }
      return throwError(() => err);
    }),
  );
};
