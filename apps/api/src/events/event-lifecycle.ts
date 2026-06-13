import { BadRequestException } from "@nestjs/common";

export type EventLifecycleStatus =
  | "active"
  | "paused"
  | "stopped"
  | "suspended";

export const EVENT_LIFECYCLE_STATUSES: EventLifecycleStatus[] = [
  "active",
  "paused",
  "stopped",
  "suspended",
];

export const EVENT_STATUS_MESSAGE_MAX = 500;

const PAUSED_NOTICE =
  "Contributions are temporarily paused for this event.";
const SUSPENDED_NOTICE = "This event is currently unavailable.";

export function parseEventLifecycleStatus(
  raw: string | null | undefined
): EventLifecycleStatus {
  if (
    raw === "paused" ||
    raw === "stopped" ||
    raw === "suspended"
  ) {
    return raw;
  }
  return "active";
}

export function eventAcceptsContributions(
  status: EventLifecycleStatus
): boolean {
  return status === "active";
}

export function contributionBlockedMessage(
  status: EventLifecycleStatus
): string {
  switch (status) {
    case "paused":
      return PAUSED_NOTICE;
    case "stopped":
      return "This event is no longer accepting contributions.";
    case "suspended":
      return SUSPENDED_NOTICE;
    default:
      return "Contributions are not available for this event.";
  }
}

export function assertEventAcceptsContributions(
  status: EventLifecycleStatus
): void {
  if (!eventAcceptsContributions(status)) {
    throw new BadRequestException(contributionBlockedMessage(status));
  }
}

export type TreasurerLifecycleAction = "pause" | "resume" | "stop";

export function canTreasurerLifecycleAction(
  status: EventLifecycleStatus,
  action: TreasurerLifecycleAction
): boolean {
  switch (action) {
    case "pause":
      return status === "active";
    case "resume":
      return status === "paused";
    case "stop":
      return status === "active" || status === "paused";
    default:
      return false;
  }
}

export function treasurerLifecycleBlockedReason(
  status: EventLifecycleStatus
): string | null {
  if (status === "suspended") {
    return "This event is suspended and cannot be changed until an administrator restores it.";
  }
  if (status === "stopped") {
    return "This event has been stopped and cannot be changed.";
  }
  return null;
}

export type PublicStatusNotice = {
  kind: EventLifecycleStatus;
  message: string;
};

export function publicStatusNotice(input: {
  status: EventLifecycleStatus;
  statusMessage?: string | null;
}): PublicStatusNotice | null {
  const status = input.status;
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
