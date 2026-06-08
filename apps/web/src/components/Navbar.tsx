import Link from "next/link";
import { IconWallet, IconList, IconAdd } from "./Icons";
import NavbarProfile from "./NavbarProfile";
import NavbarAccountPill from "./NavbarAccountPill";
import { getCurrentUser } from "@/lib/auth-server";
import { getWalletAccount } from "@/app/actions/wallet";

export default async function Navbar() {
  const user = await getCurrentUser();
  let balanceCompact = "UGX 0";
  if (user) {
    try {
      const account = await getWalletAccount();
      balanceCompact = account.balanceCompact;
    } catch {
      balanceCompact = "UGX 0";
    }
  }

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
              className="hidden sm:flex items-center gap-1.5 text-light/80 hover:text-light text-sm transition-colors min-w-0"
            >
              <IconList className="w-4 h-4 flex-shrink-0" aria-hidden />
              My events
            </Link>
            <Link
              href="/app/create"
              className="flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-semibold px-2.5 sm:px-4 py-2 rounded-lg transition-colors min-w-0"
            >
              <span className="sm:hidden">+ Event</span>
              <span className="hidden sm:inline-flex sm:items-center sm:gap-1.5">
                <IconAdd className="w-4 h-4 flex-shrink-0" aria-hidden />
                Create Event
              </span>
            </Link>
            {user && (
              <>
                <div className="hidden sm:block">
                  <NavbarAccountPill balanceCompact={balanceCompact} />
                </div>
                <NavbarProfile
                  sessionLabel={user.email}
                  balanceCompact={balanceCompact}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
