import { Subject } from '../models/subject.model';
import { subjectPlanQuarter } from './subject-quarter';

/** Misma carrera, nombre, cuatrimestre, créditos y modalidad = misma materia. */
export function subjectContentKey(subject: Subject): string {
  const name = subject.name.trim().toLowerCase();
  const career = subject.careerId ?? '';
  const quarter = String(subjectPlanQuarter(subject));
  const credits = String(subject.credits);
  const mod = subject.modality ?? 'IN_PERSON';
  return `${career}|${name}|${quarter}|${credits}|${mod}`;
}

export function dedupeSubjects(list: readonly Subject[]): Subject[] {
  const seen = new Set<string>();
  const out: Subject[] = [];
  for (const subject of list) {
    const key = subjectContentKey(subject);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(subject);
  }
  return out;
}
