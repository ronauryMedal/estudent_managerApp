export interface Teacher {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateTeacherRequest = Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateTeacherRequest = Partial<CreateTeacherRequest>;
