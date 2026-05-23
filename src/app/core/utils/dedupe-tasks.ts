import { Task } from '../models/task.model';

/** Misma materia, título, fecha y descripción = misma tarea (aunque el API repita ids). */
export function taskContentKey(task: Task): string {
  const due = new Date(task.dueDate);
  const duePart = Number.isNaN(due.getTime())
    ? task.dueDate
    : due.toISOString().slice(0, 16);
  const title = task.title.trim().toLowerCase();
  const desc = (task.description ?? '').trim().toLowerCase();
  return `${task.subjectId}|${title}|${duePart}|${desc}`;
}

export function dedupeTasks(list: readonly Task[]): Task[] {
  const seen = new Set<string>();
  const out: Task[] = [];
  for (const task of list) {
    const key = taskContentKey(task);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(task);
  }
  return out;
}

export function sortTasksByDue(list: readonly Task[]): Task[] {
  return [...list].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

export function openTasks(list: readonly Task[]): Task[] {
  return sortTasksByDue(
    dedupeTasks(list).filter((t) => t.completed !== true),
  );
}
