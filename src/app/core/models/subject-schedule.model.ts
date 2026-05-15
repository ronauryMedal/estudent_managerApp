/** Días según la API (mayúsculas, inglés). */
export type SubjectScheduleWeekday =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

/** Bloque horario de una materia (respuesta API; POST usa HH:mm, GET puede devolver ISO en la hora). */
export interface SubjectSchedule {
  id?: string;
  subjectId?: string;
  weekday: SubjectScheduleWeekday;
  /** `"18:00"` o ISO tipo `1970-01-01T18:00:00.000Z` (solo importa la hora). */
  startTime: string;
  endTime: string;
  room?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Body de `POST /subjects/:subjectId/schedules`. */
export interface CreateSubjectScheduleRequest {
  weekday: SubjectScheduleWeekday;
  /** Formato 24 h `HH:mm`. */
  startTime: string;
  endTime: string;
  room?: string;
}

export const SUBJECT_SCHEDULE_WEEKDAYS: ReadonlyArray<{
  value: SubjectScheduleWeekday;
  label: string;
}> = [
  { value: 'MONDAY', label: 'Lunes' },
  { value: 'TUESDAY', label: 'Martes' },
  { value: 'WEDNESDAY', label: 'Miércoles' },
  { value: 'THURSDAY', label: 'Jueves' },
  { value: 'FRIDAY', label: 'Viernes' },
  { value: 'SATURDAY', label: 'Sábado' },
  { value: 'SUNDAY', label: 'Domingo' },
];
