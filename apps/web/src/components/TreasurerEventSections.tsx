"use client";

import type { ReactNode } from "react";
import type { CeremonyEvent } from "@/lib/types";
import type { GroupedTreasurerEvents } from "@/lib/event-lifecycle";

interface TreasurerEventSectionsProps {
  groups: GroupedTreasurerEvents;
  renderEvent: (event: CeremonyEvent) => ReactNode;
  listClassName?: string;
  emptyState?: ReactNode;
}

function Section({
  title,
  listClassName,
  children,
}: {
  title?: string;
  listClassName: string;
  children: ReactNode;
}) {
  return (
    <div>
      {title ? (
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-3">
          {title}
        </h2>
      ) : null}
      <div className={listClassName}>{children}</div>
    </div>
  );
}

export default function TreasurerEventSections({
  groups,
  renderEvent,
  listClassName = "space-y-4",
  emptyState = null,
}: TreasurerEventSectionsProps) {
  const total =
    groups.active.length + groups.inactive.length + groups.archived.length;

  if (total === 0) {
    return emptyState;
  }

  return (
    <div className="space-y-8">
      {groups.active.length > 0 ? (
        <Section listClassName={listClassName}>
          {groups.active.map((event) => renderEvent(event))}
        </Section>
      ) : null}
      {groups.inactive.length > 0 ? (
        <Section title="Inactive" listClassName={listClassName}>
          {groups.inactive.map((event) => renderEvent(event))}
        </Section>
      ) : null}
      {groups.archived.length > 0 ? (
        <Section title="Archived" listClassName={listClassName}>
          {groups.archived.map((event) => renderEvent(event))}
        </Section>
      ) : null}
    </div>
  );
}
