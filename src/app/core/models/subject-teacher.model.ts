export interface SubjectTeacher {
  id: string;
  subjectId: string;
  teacherId: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateSubjectTeacherRequest = Omit<SubjectTeacher, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSubjectTeacherRequest = Partial<CreateSubjectTeacherRequest>;
