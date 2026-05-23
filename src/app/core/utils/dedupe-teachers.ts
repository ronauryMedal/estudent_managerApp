import { Teacher } from '../models/teacher.model';

export function teacherContentKey(teacher: Teacher): string {
  const name = teacher.name.trim().toLowerCase();
  const email = (teacher.email ?? '').trim().toLowerCase();
  return `${name}|${email}`;
}

export function dedupeTeachers(list: readonly Teacher[]): Teacher[] {
  const seen = new Set<string>();
  const out: Teacher[] = [];
  for (const teacher of list) {
    const key = teacherContentKey(teacher);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(teacher);
  }
  return out;
}
