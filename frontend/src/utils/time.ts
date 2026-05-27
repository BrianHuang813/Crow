export function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function isDying(expiresAt: string, dyingThresholdHours = 6): boolean {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return diff > 0 && diff < dyingThresholdHours * 3_600_000;
}
