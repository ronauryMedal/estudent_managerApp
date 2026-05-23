import { environment } from '../../../environments/environment';
import { apiOrigin } from '../auth-storage';
import { User } from '../models/user.model';

/** URL absoluta para mostrar `photoUrl` relativa del API (`/uploads/avatars/...`). */
export function resolveUserPhotoUrl(
  path: string | null | undefined,
): string | null {
  if (!path?.trim()) {
    return null;
  }
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const base = apiOrigin(environment.apiUrl);
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

/** Normaliza usuario del API (campo `photoUrl`) para plantillas y almacenamiento local. */
export function normalizeUser(user: User): User {
  const photoUrl = user.photoUrl ?? null;
  return {
    ...user,
    photoUrl,
    avatarUrl: resolveUserPhotoUrl(photoUrl),
  };
}
