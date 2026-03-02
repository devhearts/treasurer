"use client";

import EventCard from "@/components/EventCard";
import { getAllEvents } from "@/lib/data";
import Link from "next/link";

export default function EventsPage() {
  const events = getAllEvents();

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Active Events
              </h1>
              <p className="text-gray-500 mt-1">
                {events.length} events currently collecting contributions
              </p>
            </div>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold px-5 py-3 rounded-xl transition-colors"
            >
              + Create New Event
            </Link>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { label: "All Events", value: "all" },
            { label: "💍 Weddings", value: "wedding" },
            { label: "🤝 Kwanjula", value: "introduction" },
            { label: "🕊️ Mabugo", value: "funeral" },
          ].map((tab) => (
            <button
              key={tab.value}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                tab.value === "all"
                  ? "bg-purple-700 text-white border-purple-700"
                  : "bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No events yet
            </h3>
            <p className="text-gray-400 mb-6">
              Be the first to create an event!
            </p>
            <Link
              href="/create"
              className="bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-800 transition-colors"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
