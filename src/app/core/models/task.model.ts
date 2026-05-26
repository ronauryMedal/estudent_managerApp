export interface Task {
  id: string;
  userId: string;
  subjectId: string;
  title: string;
  description?: string;
  dueDate: string;
  /** Campo actual del backend. Si no existe, la tarea se considera pendiente. */
  isCompleted?: boolean;
  /** Alias histórico local. */
  completed?: boolean;
  aiResearch?: {
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    pdfUrl?: string | null;
    error?: string | null;
  } | null;
  /** Estado local usado cuando la tarea todavía no se sincronizó con el API. */
  offlineStatus?: 'pending';
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate: string;
  subjectId: string;
  generateAiResearch?: boolean;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest> & {
  isCompleted?: boolean;
};
