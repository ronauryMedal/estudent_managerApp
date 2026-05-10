export interface Task {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  /** Si el backend lo envía; si no existe, las tareas se consideran pendientes. */
  completed?: boolean;
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
