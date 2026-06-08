import Link from "next/link";
import { IconWallet } from "./Icons";

interface NavbarAccountPillProps {
  balanceCompact: string;
}

export default function NavbarAccountPill({ balanceCompact }: NavbarAccountPillProps) {
  return (
    <Link
      href="/app/account"
      className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-light hover:bg-white/15 transition-colors min-w-0"
      aria-label="Open account"
    >
      <IconWallet className="w-4 h-4 text-accent flex-shrink-0" />
      <span className="font-medium text-accent truncate max-w-[5.5rem] sm:max-w-[7rem]">
        {balanceCompact}
      </span>
      <svg
        className="w-3 h-3 text-light/70 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </Link>
  );
}
