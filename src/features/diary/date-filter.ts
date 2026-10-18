export function diaryDateBounds(filters: { from?: string; to?: string }): { from?: string; to?: string } {
  return {
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00.000+05:30`).toISOString() } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999+05:30`).toISOString() } : {}),
  };
}
