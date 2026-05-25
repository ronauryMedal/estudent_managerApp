import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, apiOrigin } from '../auth-storage';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../models';
import { normalizeUser } from '../utils/user-photo-url';
import { StudentTaskNotificationsService } from './student-task-notifications.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly taskNotifications = inject(StudentTaskNotificationsService);
  /** Base `…/auth` → login `POST …/auth/login`, register `POST …/auth/register` */
  private readonly authBaseUrl = `${apiOrigin(environment.apiUrl)}/auth`;

  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly accessToken = this._accessToken.asReadonly();
  readonly isAuthenticated = computed(() => this._accessToken() !== null);

  constructor() {
    this.restoreSessionFromStorage();
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/login`, credentials)
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.authBaseUrl}/register`, data)
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    void this.taskNotifications.clearAll();
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  getToken(): string | null {
    return this._accessToken();
  }

  /** Actualiza usuario en memoria y localStorage (p. ej. tras subir foto). */
  updateCurrentUser(user: User): void {
    const normalized = normalizeUser(user);
    this._currentUser.set(normalized);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
  }

  private persistSession(response: AuthResponse): void {
    const user = normalizeUser(response.user);
    this._accessToken.set(response.access_token);
    this._currentUser.set(user);
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }

  private restoreSessionFromStorage(): void {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const rawUser = localStorage.getItem(AUTH_USER_KEY);

    if (!token || !rawUser) {
      return;
    }

    try {
      const user = normalizeUser(JSON.parse(rawUser) as User);
      this._accessToken.set(token);
      this._currentUser.set(user);
    } catch {
      this.logout();
    }
  }
}
