// Helper functions (data now lives in SQLite via @/lib/db and @/app/actions/events)

export function formatUGX(amount: number): string {
  return `UGX ${amount.toLocaleString("en-UG")}`;
}

export function getProgressPercent(raised: number, target: number): number {
  return Math.min(Math.round((raised / target) * 100), 100);
}

export function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    wedding: "Wedding",
    introduction: "Introduction (Kwanjula)",
    funeral: "Funeral (Mabugo)",
    other: "Other Ceremony",
  };
  return labels[type] ?? "Ceremony";
}

export function getEventTypeKey(type: string): string {
  return type in { wedding: 1, introduction: 1, funeral: 1, other: 1 }
    ? type
    : "other";
}
