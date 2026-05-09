export interface UserSemester {
  id: string;
  userCareerId: string;
  number: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateUserSemesterRequest = Omit<UserSemester, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserSemesterRequest = Partial<CreateUserSemesterRequest>;
