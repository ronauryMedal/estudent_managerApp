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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
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
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  }

  getToken(): string | null {
    return this._accessToken();
  }

  private persistSession(response: AuthResponse): void {
    this._accessToken.set(response.access_token);
    this._currentUser.set(response.user);
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.user));
  }

  private restoreSessionFromStorage(): void {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const rawUser = localStorage.getItem(AUTH_USER_KEY);

    if (!token || !rawUser) {
      return;
    }

    try {
      const user = JSON.parse(rawUser) as User;
      this._accessToken.set(token);
      this._currentUser.set(user);
    } catch {
      this.logout();
    }
  }
}
