import { Subject } from '../models/subject.model';

/** Cuatrimestre en el plan: la API puede usar `quarterNumber` o el legado `semesterNumber`. */
export function subjectPlanQuarter(sub: Subject): number {
  return sub.quarterNumber ?? sub.semesterNumber;
}
