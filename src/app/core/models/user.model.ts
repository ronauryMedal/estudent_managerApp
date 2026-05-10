export type UserRole = 'ADMIN' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  /** URL pública del avatar cuando el backend la envíe en login/register. */
  avatarUrl?: string | null;
  careers?: unknown | null;
  createdAt?: string;
  updatedAt?: string;
}
