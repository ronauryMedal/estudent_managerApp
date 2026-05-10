import { SubjectSchedule } from './subject-schedule.model';

/** Modalidad de dictado; el backend usa `IN_PERSON` por defecto si no se envía. */
export type SubjectModality = 'IN_PERSON' | 'VIRTUAL' | 'HYBRID';

export const SUBJECT_MODALITY_LABELS: Record<SubjectModality, string> = {
  IN_PERSON: 'Presencial',
  VIRTUAL: 'Virtual',
  HYBRID: 'Híbrida',
};

export interface Subject {
  id: string;
  name: string;
  credits: number;
  /** Número de cuatrimestre en el plan (API nueva). */
  quarterNumber?: number;
  /** Alias histórico si el backend aún lo envía. */
  semesterNumber: number;
  careerId: string;
  modality?: SubjectModality;
  /** Presencial/híbrido; en virtual suele ser null. */
  building?: string | null;
  section?: string | null;
  courseNumber?: string | null;
  /**
   * Bloques ordenados por día y hora (viene en GET /subjects y /subjects/:id).
   * Altas/edición de bloques: `POST/PATCH /subjects/:id/schedules`.
   */
  schedules?: SubjectSchedule[];
  /** Legado / texto libre si la API lo envía además de `schedules`. */
  scheduleSummary?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateSubjectRequest = Omit<
  Subject,
  'id' | 'createdAt' | 'updatedAt' | 'schedules'
>;
export type UpdateSubjectRequest = Partial<CreateSubjectRequest>;

/** `POST /subjects/me` — `careerId` debe ser una carrera creada por el estudiante (`GET /careers/me`). */
export interface CreateMySubjectRequest {
  careerId: string;
  quarterNumber: number;
  name: string;
  credits: number;
  modality?: SubjectModality;
  building?: string | null;
  section?: string | null;
  courseNumber?: string | null;
}
