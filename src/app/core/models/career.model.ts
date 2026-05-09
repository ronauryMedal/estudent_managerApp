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
