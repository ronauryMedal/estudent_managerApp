export type AiResearchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type AiResearchMode =
  | 'QUESTIONNAIRE_WITH_BOOK'
  | 'QUESTIONNAIRE_WEB'
  | 'FROM_BOOK'
  | string;

export interface TaskAiResearch {
  status: AiResearchStatus;
  pdfUrl?: string | null;
  presentationPdfUrl?: string | null;
  pptxUrl?: string | null;
  error?: string | null;
  researchMode?: AiResearchMode | null;
  basedOnUploadedPdf?: boolean;
  sourcePdfUrl?: string | null;
  advancedMode?: boolean;
  targetPages?: number;
  focusNotes?: string | null;
  forPresentation?: boolean;
  presentationSlides?: number;
}

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
  aiResearch?: TaskAiResearch | null;
  /** Estado local usado cuando la tarea todavía no se sincronizó con el API. */
  offlineStatus?: 'pending';
  createdAt?: string;
  updatedAt?: string;
}

/** Opciones de investigación IA (`aiResearchOptions` JSON). */
export interface AiResearchOptions {
  advancedMode?: boolean;
  targetPages?: number;
  focusNotes?: string;
  forPresentation?: boolean;
  presentationSlides?: number;
  basedOnUploadedPdf?: boolean;
  questionnaireMode?: boolean;
  useWebResearch?: boolean;
  validateDocumentTypes?: boolean;
}

export interface AiResearchPdfFiles {
  bookPdf?: File;
  questionnairePdf?: File;
}

export interface CreateTaskAiExtras {
  pdfFiles?: AiResearchPdfFiles;
  aiResearchOptions?: AiResearchOptions;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate: string;
  subjectId: string;
  generateAiResearch?: boolean;
  aiResearchOptions?: AiResearchOptions;
}

export type UpdateTaskRequest = Partial<CreateTaskRequest> & {
  isCompleted?: boolean;
};
