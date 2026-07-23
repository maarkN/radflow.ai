const STORAGE_KEY = 'radflow.radiologistId';

/** Demo identity until real auth lands (epic 4): one uuid per browser. */
export function getRadiologistId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return stored;
  }
  const generated = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}
