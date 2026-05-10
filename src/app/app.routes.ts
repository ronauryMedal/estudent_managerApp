import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './core/guards/auth.guard';
import {
  studentCareerRequiredGuard,
  studentSetupCareerPageGuard,
} from './core/guards/career-setup.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./auth/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'setup-career',
        canActivate: [studentSetupCareerPageGuard],
        loadComponent: () =>
          import('./setup-career/setup-career.page').then(
            (m) => m.SetupCareerPage,
          ),
      },
      {
        path: '',
        canActivate: [studentCareerRequiredGuard],
        loadChildren: () =>
          import('./tabs/tabs.routes').then((m) => m.routes),
      },
    ],
  },
];
