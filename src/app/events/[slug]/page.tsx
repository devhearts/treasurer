"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getEventBySlug,
  formatUGX,
  getProgressPercent,
  getEventTypeLabel,
  getEventTypeEmoji,
} from "@/lib/data";
import ContributeForm from "./ContributeForm";
import ContributionReceipt from "@/components/ContributionReceipt";
import { useEffect, useState } from "react";
import { CeremonyEvent } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function EventDetailPage({ params }: PageProps) {
  const [event, setEvent] = useState<CeremonyEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string>("");

  useEffect(() => {
    async function loadEvent() {
      const { slug: eventSlug } = await params;
      setSlug(eventSlug);
      const eventData = getEventBySlug(eventSlug);
      setEvent(eventData || null);
      setLoading(false);
    }
    loadEvent();
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-purple-700">Loading...</div>
      </div>
    );
  }

  if (!event) {
    notFound();
  }

  const progress = getProgressPercent(event.raisedAmount, event.targetAmount);
  const paidContributions = event.contributions.filter(
    (c) => c.status === "paid"
  );
  const pledgedContributions = event.contributions.filter(
    (c) => c.status === "pledged"
  );
  const paidTotal = paidContributions.reduce((sum, c) => sum + c.amount, 0);
  const pledgedTotal = pledgedContributions.reduce(
    (sum, c) => sum + c.amount,
    0
  );

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Event Header */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/events"
            className="inline-flex items-center gap-1 text-purple-300 hover:text-white text-sm mb-6 transition-colors"
          >
            ← Back to Events
          </Link>
          <div className="flex items-start gap-4">
            <div className="text-5xl">
              {getEventTypeEmoji(event.type)}
            </div>
            <div>
              <span className="inline-block bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full mb-3">
                {getEventTypeLabel(event.type)}
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
                {event.title}
              </h1>
              <p className="text-purple-200 text-sm">
                📍 {event.location} &nbsp;·&nbsp; 📅{" "}
                {new Date(event.date).toLocaleDateString("en-UG", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="text-purple-300 text-sm mt-1">
                Organized by {event.organizer}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                About This Event
              </h2>
              <p className="text-gray-600 leading-relaxed">{event.description}</p>
            </div>

            {/* Budget Breakdown */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                📊 Budget Breakdown
              </h2>
              <div className="space-y-3">
                {event.budgetItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-semibold text-gray-900">
                      {formatUGX(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 font-bold text-purple-700">
                  <span>Total Budget</span>
                  <span>{formatUGX(event.targetAmount)}</span>
                </div>
              </div>
            </div>

            {/* Contributions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  💝 Contributions
                </h2>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600 font-medium">
                    {paidContributions.length} paid
                  </span>
                  {pledgedContributions.length > 0 && (
                    <span className="text-yellow-600 font-medium">
                      {pledgedContributions.length} pledged
                    </span>
                  )}
                </div>
              </div>

              {event.contributions.length === 0 ? (
                <p className="text-gray-400 text-center py-6">
                  No contributions yet. Be the first!
                </p>
              ) : (
                <div className="space-y-3">
                  {event.contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="flex items-start justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
                          {contribution.anonymous
                            ? "?"
                            : contribution.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {contribution.anonymous
                              ? "Anonymous"
                              : contribution.name}
                          </p>
                          {contribution.message && (
                            <p className="text-gray-500 text-xs mt-0.5 italic">
                              &ldquo;{contribution.message}&rdquo;
                            </p>
                          )}
                          <p className="text-gray-400 text-xs mt-0.5">
                            {new Date(contribution.date).toLocaleDateString(
                              "en-UG",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 text-sm">
                          {formatUGX(contribution.amount)}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            contribution.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {contribution.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Contribution Receipt */}
            <ContributionReceipt
              eventTitle={event.title}
              eventDate={event.date}
              eventLocation={event.location}
              contributions={event.contributions}
              raisedAmount={event.raisedAmount}
              targetAmount={event.targetAmount}
            />

            {/* Wedding Invitations */}
            {event.type === "wedding" && (
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 border border-pink-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">💌</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Personalised Invitations
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Generate a custom invitation card for each contributor and
                      share it directly on WhatsApp.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/events/${event.slug}/invite`}
                  className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-colors w-full justify-center"
                >
                  💌 Create Invitation Cards
                </Link>
              </div>
            )}
          </div>

          {/* Right Column — Sticky */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="text-center mb-4">
                <p className="text-3xl font-extrabold text-gray-900">
                  {formatUGX(event.raisedAmount)}
                </p>
                <p className="text-gray-400 text-sm">
                  raised of {formatUGX(event.targetAmount)} goal
                </p>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm font-semibold text-orange-500 mb-4">
                {progress}% of goal reached
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-green-700">
                    {formatUGX(paidTotal)}
                  </p>
                  <p className="text-xs text-green-600">Collected</p>
                </div>
                <div className="bg-yellow-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-yellow-700">
                    {formatUGX(pledgedTotal)}
                  </p>
                  <p className="text-xs text-yellow-600">Pledged</p>
                </div>
              </div>

              {/* Share */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-500 text-center mb-2">
                  Share this event
                </p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 truncate">
                    ceremonywallet.ug/events/{event.slug}
                  </div>
                  <button className="bg-purple-700 text-white text-xs px-3 py-2 rounded-lg hover:bg-purple-800 transition-colors font-medium">
                    Copy
                  </button>
                </div>
              </div>
            </div>

            {/* Contribute Form */}
            <ContributeForm
              eventId={event.id}
              eventTitle={event.title}
              treasurerPhone={event.treasurerPhone}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
