import Link from "next/link";
import { IconWallet, IconList, IconAdd } from "./Icons";

export default function Navbar() {
  return (
    <nav className="bg-surface border-b border-muted/30 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2 text-light hover:text-accent transition-colors">
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/events"
              className="flex items-center gap-1.5 text-light/80 hover:text-light text-sm transition-colors min-w-0"
            >
              <IconList className="w-4 h-4 flex-shrink-0 sm:hidden" aria-hidden />
              <span className="sm:hidden">Browse</span>
              <span className="hidden sm:inline">Browse Events</span>
            </Link>
            <Link
              href="/create"
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors min-w-0"
            >
              <IconAdd className="w-4 h-4 flex-shrink-0 sm:hidden" aria-hidden />
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Event</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
