export interface Career {
  id: string;
  name: string;
  description: string;
  totalCredits: number;
  totalSemester: number;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateCareerRequest = Omit<Career, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCareerRequest = Partial<CreateCareerRequest>;

/** `POST /careers/me` — crea tu plan y, por defecto, lo activa como inscripción actual. */
export interface CreateMyCareerMeRequest {
  name: string;
  institution: string;
  description?: string;
  totalCredits: number;
  /** Cantidad de cuatrimestres del plan (p. ej. 1 para un curso corto). */
  totalSemester: number;
  /** Por defecto en API suele ser `true`: deja esta carrera como plan activo. */
  activate?: boolean;
  /** Debe ser ≤ `totalSemester`. */
  currentSemester?: number;
}
