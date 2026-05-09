export interface Subject {
  id: string;
  name: string;
  credits: number;
  semesterNumber: number;
  careerId: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateSubjectRequest = Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSubjectRequest = Partial<CreateSubjectRequest>;
