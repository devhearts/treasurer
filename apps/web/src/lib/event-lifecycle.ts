export type EventLifecycleStatus =
  | "active"
  | "paused"
  | "stopped"
  | "suspended";

const PAUSED_NOTICE =
  "Contributions are temporarily paused for this event.";
const SUSPENDED_NOTICE = "This event is currently unavailable.";

export type PublicStatusNotice = {
  kind: EventLifecycleStatus;
  message: string;
};

export function publicStatusNotice(input: {
  status?: EventLifecycleStatus;
  statusMessage?: string | null;
}): PublicStatusNotice | null {
  const status = input.status ?? "active";
  if (status === "active") return null;
  if (status === "stopped") {
    const msg = input.statusMessage?.trim();
    return {
      kind: "stopped",
      message: msg || "This event is no longer accepting contributions.",
    };
  }
  if (status === "paused") {
    return { kind: "paused", message: PAUSED_NOTICE };
  }
  return { kind: "suspended", message: SUSPENDED_NOTICE };
}

export function eventStatusLabel(status: EventLifecycleStatus): string {
  switch (status) {
    case "paused":
      return "Paused";
    case "stopped":
      return "Stopped";
    case "suspended":
      return "Suspended";
    default:
      return "Active";
  }
}

export function eventStatusBadgeClass(status: EventLifecycleStatus): string {
  switch (status) {
    case "paused":
      return "bg-amber-100 text-amber-900 border-amber-200";
    case "stopped":
      return "bg-muted/20 text-muted border-muted/40";
    case "suspended":
      return "bg-red-100 text-red-900 border-red-200";
    default:
      return "bg-accent/10 text-accent border-accent/20";
  }
}
