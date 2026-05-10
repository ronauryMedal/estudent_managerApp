import { Subject } from '../models/subject.model';
import { SubjectSchedule } from '../models/subject-schedule.model';

const WEEKDAY_ORDER: Record<string, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7,
};

const WEEKDAY_LABEL_ES: Record<string, string> = {
  MONDAY: 'Lun',
  TUESDAY: 'Mar',
  WEDNESDAY: 'Mié',
  THURSDAY: 'Jue',
  FRIDAY: 'Vie',
  SATURDAY: 'Sáb',
  SUNDAY: 'Dom',
};

const LEGACY_SCHEDULE_KEYS = [
  'scheduleSummary',
  'schedule',
  'classSchedule',
  'horario',
  'timeSlot',
] as const;

/** Normaliza a `HH:mm` (entrada `HH:mm` o ISO con hora en UTC como devuelve Prisma). */
export function parseScheduleTimeToHHmm(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{1,2}:\d{2}/.test(trimmed)) {
    const [h, rest] = trimmed.split(':');
    const m = (rest ?? '00').slice(0, 2);
    const hh = h.padStart(2, '0');
    return `${hh}:${m.padStart(2, '0')}`;
  }
  const d = new Date(trimmed);
  if (!Number.isNaN(d.getTime())) {
    const hh = d.getUTCHours().toString().padStart(2, '0');
    const mm = d.getUTCMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }
  return trimmed;
}

function normWeekday(w: string): string {
  return String(w).toUpperCase();
}

function formatScheduleBlock(b: SubjectSchedule): string {
  const wk = normWeekday(b.weekday);
  const day = WEEKDAY_LABEL_ES[wk] ?? wk.slice(0, 3);
  const t0 = parseScheduleTimeToHHmm(b.startTime);
  const t1 = parseScheduleTimeToHHmm(b.endTime);
  let line = `${day} ${t0}–${t1}`;
  if (b.room?.trim()) {
    line += ` · ${b.room.trim()}`;
  }
  return line;
}

/** Líneas listas para mostrar (una por bloque), ordenadas por día y hora de inicio. */
export function subjectScheduleLines(subject: Subject): string[] {
  const list = subject.schedules;
  if (list?.length) {
    const sorted = [...list].sort((a, b) => {
      const da = WEEKDAY_ORDER[normWeekday(a.weekday)] ?? 99;
      const db = WEEKDAY_ORDER[normWeekday(b.weekday)] ?? 99;
      if (da !== db) {
        return da - db;
      }
      return parseScheduleTimeToHHmm(a.startTime).localeCompare(
        parseScheduleTimeToHHmm(b.startTime),
      );
    });
    return sorted.map(formatScheduleBlock);
  }

  const row = subject as Subject & Record<string, unknown>;
  for (const k of LEGACY_SCHEDULE_KEYS) {
    const v = row[k];
    if (typeof v === 'string' && v.trim()) {
      return [v.trim()];
    }
  }

  const wd = row['weekdays'];
  const tr = row['timeRange'];
  if (typeof wd === 'string' && typeof tr === 'string' && wd.trim() && tr.trim()) {
    return [`${wd.trim()} · ${tr.trim()}`];
  }

  return [];
}

/** Texto compacto (una sola cadena); preferir `subjectScheduleLines` en plantillas con varios bloques. */
export function subjectScheduleDisplay(subject: Subject): string {
  const lines = subjectScheduleLines(subject);
  if (lines.length > 0) {
    return lines.join(' · ');
  }
  return 'Horario a confirmar';
}

/** Línea opcional: edificio, sección, código de curso (presencial/híbrido). */
export function subjectCourseDetailLine(subject: Subject): string | null {
  const parts: string[] = [];
  if (subject.building?.trim()) {
    parts.push(subject.building.trim());
  }
  if (subject.section?.trim()) {
    parts.push(`Sección ${subject.section.trim()}`);
  }
  if (subject.courseNumber?.trim()) {
    parts.push(subject.courseNumber.trim());
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
