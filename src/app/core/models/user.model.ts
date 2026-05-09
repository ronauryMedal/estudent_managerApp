export type UserRole = 'ADMIN' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  careers?: unknown | null;
  createdAt?: string;
  updatedAt?: string;
}
