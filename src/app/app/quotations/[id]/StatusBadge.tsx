"use client";

const BADGE: Record<string, string> = {
  draft: "bg-muted/20 text-muted",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block text-xs px-3 py-1 rounded-full font-semibold capitalize ${BADGE[status] ?? BADGE.draft}`}>
      {status}
    </span>
  );
}
