import { notFound } from "next/navigation";
import Link from "next/link";
import { getEventBySlug } from "@/lib/data";
import InviteCardGenerator from "./InviteCardGenerator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  // Only weddings get invitation cards
  if (event.type !== "wedding") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-700 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Link
            href={`/events/${slug}`}
            className="inline-flex items-center gap-1 text-pink-200 hover:text-white text-sm mb-5 transition-colors"
          >
            ← Back to Event
          </Link>
          <div className="flex items-start gap-4">
            <span className="text-4xl">💌</span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">
                Wedding Invitation Cards
              </h1>
              <p className="text-pink-200 text-sm">
                {event.title}
              </p>
              <p className="text-pink-300 text-xs mt-1">
                Generate personalised invitations for each guest and share on WhatsApp
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Info Banner */}
        <div className="bg-pink-50 border border-pink-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">💡</span>
          <div>
            <p className="font-semibold text-pink-900 text-sm">
              How personalised invitations work
            </p>
            <p className="text-pink-700 text-xs mt-1 leading-relaxed">
              Each invitation is customised with the guest&apos;s name and your personal
              message. Copy it or tap &quot;Send on WhatsApp&quot; to open WhatsApp with the
              invitation pre-filled — ready to send in one tap.
            </p>
          </div>
        </div>

        <InviteCardGenerator event={event} />
      </div>
    </main>
  );
}
