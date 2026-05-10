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
  semesterNumber: number;
  careerId: string;
  /** Opcional en create/update; la API puede devolverla siempre tras persistir. */
  modality?: SubjectModality;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateSubjectRequest = Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSubjectRequest = Partial<CreateSubjectRequest>;
