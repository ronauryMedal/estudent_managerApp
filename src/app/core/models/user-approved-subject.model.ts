export interface UserApprovedSubject {
  id: string;
  userId: string;
  subjectId: string;
  approvedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateUserApprovedSubjectRequest = Omit<
  UserApprovedSubject,
  'id' | 'createdAt' | 'updatedAt'
>;
export type UpdateUserApprovedSubjectRequest = Partial<CreateUserApprovedSubjectRequest>;
