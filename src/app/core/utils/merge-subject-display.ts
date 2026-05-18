import { Subject } from '../models/subject.model';

/** Combina materia del plan y del avance priorizando horarios y profesores completos. */
export function mergeSubjectForDisplay(
  fromPlan: Subject | undefined,
  fromOther: Subject,
): Subject {
  if (!fromPlan) {
    return fromOther;
  }
  const schedules =
    fromOther.schedules?.length ? fromOther.schedules : fromPlan.schedules;
  const teachers =
    fromOther.teachers?.length ? fromOther.teachers : fromPlan.teachers;
  return {
    ...fromPlan,
    ...fromOther,
    schedules: schedules?.length ? schedules : [],
    teachers,
  };
}
