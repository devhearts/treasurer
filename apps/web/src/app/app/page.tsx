import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyEvents } from "@/app/actions/events";
import { IconWallet } from "@/components/Icons";
import HomeEventsList from "@/components/HomeEventsList";

export default async function AppHome() {
  const events = await getMyEvents();
  if (events.length === 0) {
    redirect("/app/onboarding");
  }
  const featured = events.slice(0, 5);

  return (
    <main>
      <section className="bg-surface text-light">
        <div className="max-w-lg mx-auto px-4 py-12 sm:py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight mb-2">
            The Transparent Treasurer
            <span className="block text-accent">for Every Ceremony</span>
          </h1>
          <p className="text-light/80 text-sm mb-8">
            Track contributions for weddings, kwanjula, and mabugo. We never hold your money.
          </p>
          <Link
            href="/app/create"
            className="cta-primary block text-center"
          >
            Create your event
          </Link>
        </div>
      </section>

      <section className="px-4 py-4 border-b border-muted/20 bg-light">
        <div className="max-w-lg mx-auto flex justify-center">
          <Link href="/app/events" className="text-sm text-accent font-medium hover:underline">
            <span className="sm:hidden">My events</span>
            <span className="hidden sm:inline">My events</span>
          </Link>
        </div>
      </section>

      <section className="max-w-lg mx-auto px-4 py-6">
        <details open className="bg-light rounded-xl border border-muted/30 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none font-bold text-surface flex items-center justify-between">
            How it works
            <span className="text-muted text-sm font-normal group-open:rotate-180 transition-transform">&#9660;</span>
          </summary>
          <div className="px-4 pb-4 space-y-4 text-sm text-muted border-t border-muted/20 pt-4">
            <p><strong className="text-surface">1. Create</strong> — Set up your event and Mobile Money number.</p>
            <p><strong className="text-surface">2. Share</strong> — Send the link. Guests pay you directly.</p>
            <p><strong className="text-surface">3. Track</strong> — See contributions and share receipts.</p>
          </div>
        </details>
      </section>

      {featured.length > 0 && (
        <section className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted text-sm">My events ({featured.length})</p>
            <Link href="/app/events" className="text-sm text-accent font-medium hover:underline">
              View all
            </Link>
          </div>
          <HomeEventsList events={featured} />
        </section>
      )}
      <footer className="bg-surface text-light/70 py-6 mt-8">
        <div className="max-w-lg mx-auto px-4 text-center text-sm">
          <span className="font-semibold text-light">CeremonyWallet</span>
          <span className="mx-2">·</span>
          <span>We never hold your money.</span>
        </div>
      </footer>
    </main>
  );
}
