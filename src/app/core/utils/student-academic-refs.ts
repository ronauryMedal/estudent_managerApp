import { User } from '../models/user.model';
import { UserCareer } from '../models/user-career.model';

export interface StudentAcademicRefs {
  careerId: string | null;
  currentSemester: number | null;
}

function refsFromCareersRecord(o: Record<string, unknown>): StudentAcademicRefs {
  let careerId: string | null = null;
  const cid = o['careerId'];
  if (typeof cid === 'string' && cid.trim()) {
    careerId = cid.trim();
  } else {
    const nested = o['career'];
    if (nested && typeof nested === 'object' && nested !== null) {
      const id = (nested as Record<string, unknown>)['id'];
      if (typeof id === 'string' && id.trim()) {
        careerId = id.trim();
      }
    }
  }

  let currentSemester: number | null = null;
  const s = o['currentSemester'];
  if (typeof s === 'number' && !Number.isNaN(s)) {
    currentSemester = s;
  }

  return { careerId, currentSemester };
}

/**
 * Carrera y cuatrimestre/semestre académico para filtrar materias.
 * Prioriza `GET /user-careers/me` si existe; si no, intenta `user.careers` del JWT.
 */
export function studentAcademicRefs(
  user: User | null,
  apiCareer: UserCareer | null,
): StudentAcademicRefs {
  if (apiCareer) {
    return {
      careerId: apiCareer.careerId ?? null,
      currentSemester:
        typeof apiCareer.currentSemester === 'number'
          ? apiCareer.currentSemester
          : null,
    };
  }

  if (!user?.careers) {
    return { careerId: null, currentSemester: null };
  }

  const c = user.careers;
  if (typeof c === 'object' && !Array.isArray(c)) {
    return refsFromCareersRecord(c as Record<string, unknown>);
  }

  if (Array.isArray(c) && c.length > 0) {
    const first = c[0];
    if (first && typeof first === 'object') {
      return refsFromCareersRecord(first as Record<string, unknown>);
    }
  }

  return { careerId: null, currentSemester: null };
}
