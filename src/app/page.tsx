import Link from "next/link";
import { getAllEvents } from "@/app/actions/events";
import { IconWallet } from "@/components/Icons";
import HomeEventsList from "@/components/HomeEventsList";

export default async function Home() {
  const events = await getAllEvents();
  const featured = events.slice(0, 5);

  return (
    <main>
      {/* Above fold: one headline, one line, one primary CTA */}
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
            href="/create"
            className="cta-primary block text-center"
          >
            Create your event
          </Link>
        </div>
      </section>

      {/* Secondary: single link, no competing CTA */}
      <section className="px-4 py-4 border-b border-muted/20 bg-light">
        <div className="max-w-lg mx-auto flex justify-center">
          <Link href="/events" className="text-sm text-accent font-medium hover:underline">
            <span className="sm:hidden">Browse</span>
            <span className="hidden sm:inline">Browse events</span>
          </Link>
        </div>
      </section>

      {/* How it works: contextual (expandable) */}
      <section className="max-w-lg mx-auto px-4 py-6">
        <details className="bg-light rounded-xl border border-muted/30 overflow-hidden group">
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

      {/* Featured: one metric (count) + expandable list */}
      {featured.length > 0 && (
        <section className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-muted text-sm">{featured.length} event{featured.length !== 1 ? "s" : ""} collecting</p>
            <Link href="/events" className="text-sm text-accent font-medium hover:underline">
              View all
            </Link>
          </div>
          <HomeEventsList events={featured} />
        </section>
      )}

      {/* Pricing: contextual (expandable) */}
      <section className="max-w-lg mx-auto px-4 py-6">
        <details className="bg-light rounded-xl border border-muted/30 overflow-hidden group">
          <summary className="p-4 cursor-pointer list-none font-bold text-surface flex items-center justify-between">
            <span className="flex items-center gap-2">
              <IconWallet className="w-5 h-5 text-accent" />
              <span className="sm:hidden">Treasurers</span>
              <span className="hidden sm:inline">For treasurers</span>
            </span>
            <span className="text-accent text-lg">50,000 UGX</span>
          </summary>
          <div className="px-4 pb-4 text-sm text-muted border-t border-muted/20 pt-4">
            <p className="mb-2">One-time fee. No monthly costs. Unlimited contributors.</p>
            <Link href="/create" className="cta-primary block text-center mt-4">
              Get started
            </Link>
          </div>
        </details>
      </section>

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
