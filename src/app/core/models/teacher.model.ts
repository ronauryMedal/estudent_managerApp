export interface Teacher {
  id: string;
  name: string;
  email?: string | null;
  /** Solo en profesores creados por el estudiante (`GET /teachers/me`). */
  ownerUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateTeacherRequest = Omit<
  Teacher,
  'id' | 'createdAt' | 'updatedAt' | 'ownerUserId'
>;

/** Body de `POST /teachers/me` (estudiante). */
export type CreateMyTeacherRequest = {
  name: string;
  email?: string;
};

export type UpdateTeacherRequest = Partial<CreateTeacherRequest>;
