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
  const pickStr = (primary?: string | null, fallback?: string | null) =>
    (primary?.trim() ? primary : fallback?.trim() ? fallback : null) ?? null;

  return {
    ...fromPlan,
    ...fromOther,
    modality: fromOther.modality ?? fromPlan.modality,
    building: pickStr(fromOther.building, fromPlan.building),
    section: pickStr(fromOther.section, fromPlan.section),
    courseNumber: pickStr(fromOther.courseNumber, fromPlan.courseNumber),
    schedules: schedules?.length ? schedules : [],
    teachers,
  };
}
