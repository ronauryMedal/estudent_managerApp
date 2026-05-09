export interface Task {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate: string;
  subjectId: string;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest>;
