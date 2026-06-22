import { redirect } from "next/navigation";
import { getMyEvents } from "@/app/actions/events";
import Link from "next/link";
import { EVENT_TYPE_FILTER_LABELS } from "@/lib/data";
import { EventType } from "@/lib/types";
import EventsList from "./EventsList";

type FilterValue = "all" | EventType;

export default async function EventsPage() {
  const events = await getMyEvents();
  if (events.length === 0) {
    redirect("/app/onboarding");
  }

  const tabs: { value: FilterValue; label: string; type?: EventType }[] = [
    { value: "all", label: "All" },
    { value: "wedding", label: EVENT_TYPE_FILTER_LABELS.wedding, type: "wedding" },
    {
      value: "introduction",
      label: EVENT_TYPE_FILTER_LABELS.introduction,
      type: "introduction",
    },
    { value: "funeral", label: EVENT_TYPE_FILTER_LABELS.funeral, type: "funeral" },
    { value: "charity", label: EVENT_TYPE_FILTER_LABELS.charity, type: "charity" },
  ];

  return (
    <main className="min-h-screen bg-light">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-xl font-bold text-surface">My events</h1>
          <Link href="/app/create" className="cta-primary text-center text-sm py-3 px-4">
            <span className="sm:hidden">Create</span>
            <span className="hidden sm:inline">Create event</span>
          </Link>
        </div>
      </div>
      <EventsList events={events} tabs={tabs} />
    </main>
  );
}
