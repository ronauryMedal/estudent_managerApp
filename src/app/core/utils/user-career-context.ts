import { User } from '../models/user.model';

/** Texto corto para el panel (carrera / semestre) a partir de `user.careers` si viene en la API. */
export function userCareerContextLine(user: User | null): string | null {
  if (!user?.careers) {
    return null;
  }

  const c = user.careers;

  const nameFrom = (o: Record<string, unknown>): string | null => {
    if (typeof o['name'] === 'string' && o['name'].trim()) {
      return o['name'].trim();
    }
    const nested = o['career'];
    if (nested && typeof nested === 'object' && nested !== null) {
      const n = (nested as Record<string, unknown>)['name'];
      if (typeof n === 'string' && n.trim()) {
        return n.trim();
      }
    }
    return null;
  };

  const semesterFrom = (o: Record<string, unknown>): number | null => {
    const s = o['currentSemester'];
    if (typeof s === 'number' && !Number.isNaN(s)) {
      return s;
    }
    return null;
  };

  if (typeof c === 'object' && !Array.isArray(c)) {
    const o = c as Record<string, unknown>;
    const name = nameFrom(o);
    const sem = semesterFrom(o);
    if (name && sem != null) {
      return `${name} · Semestre ${sem}`;
    }
    if (name) {
      return name;
    }
    if (sem != null) {
      return `Semestre ${sem}`;
    }
    return null;
  }

  if (Array.isArray(c) && c.length > 0) {
    const first = c[0];
    if (first && typeof first === 'object') {
      const o = first as Record<string, unknown>;
      const name = nameFrom(o);
      const sem = semesterFrom(o);
      if (name && sem != null) {
        return `${name} · Semestre ${sem}`;
      }
      if (name) {
        return name;
      }
      if (sem != null) {
        return `Semestre ${sem}`;
      }
    }
  }

  return null;
}
