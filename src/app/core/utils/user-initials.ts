/** Hasta 2 letras para avatar sin imagen. */
export function userInitials(fullName: string | null | undefined): string {
  const n = fullName?.trim();
  if (!n) {
    return '?';
  }
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
