export interface UserCareer {
  id: string;
  userId: string;
  careerId: string;
  currentSemester: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SelectMyCareerRequest {
  careerId: string;
  currentSemester: number;
}

export type CreateUserCareerRequest = Omit<UserCareer, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserCareerRequest = Partial<CreateUserCareerRequest>;
