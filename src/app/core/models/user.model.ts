export type UserRole = 'ADMIN' | 'STUDENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  /** Ruta relativa del API, ej. `/uploads/avatars/uuid.jpg`. */
  photoUrl?: string | null;
  /** URL absoluta lista para `<img>` (calculada en el front). */
  avatarUrl?: string | null;
  careers?: unknown | null;
  createdAt?: string;
  updatedAt?: string;
}
