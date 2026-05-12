import Link from "next/link";
import { IconWallet, IconList, IconAdd } from "./Icons";
import NavbarProfile from "./NavbarProfile";
import { getCurrentUser } from "@/lib/auth-server";

export default async function Navbar() {
  const user = await getCurrentUser();

  return (
    <nav className="bg-surface border-b border-muted/30 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/app" className="flex items-center gap-2 text-light hover:text-accent transition-colors">
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/app/events"
              className="flex items-center gap-1.5 text-light/80 hover:text-light text-sm transition-colors min-w-0"
            >
              <IconList className="w-4 h-4 flex-shrink-0 sm:hidden" aria-hidden />
              <span className="sm:hidden">My events</span>
              <span className="hidden sm:inline">My events</span>
            </Link>
            <Link
              href="/app/create"
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-3 sm:px-4 py-2 rounded-lg transition-colors min-w-0"
            >
              <IconAdd className="w-4 h-4 flex-shrink-0 sm:hidden" aria-hidden />
              <span className="sm:hidden">Create</span>
              <span className="hidden sm:inline">Create Event</span>
            </Link>
            {user && (
              <NavbarProfile sessionLabel={user.email} />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
