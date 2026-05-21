"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconList, IconUser, IconWallet } from "./Icons";
import { clearSession } from "@/app/actions/auth";

interface NavbarProfileProps {
  /** Session value shown as profile label (e.g. email). */
  sessionLabel: string;
  balanceCompact: string;
}

export default function NavbarProfile({
  sessionLabel,
  balanceCompact,
}: NavbarProfileProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  async function handleLogout() {
    await clearSession();
    setOpen(false);
    router.refresh();
    router.push("/");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-full text-light/90 hover:text-light hover:bg-white/10 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Profile menu"
      >
        <IconUser className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-muted/30 bg-light shadow-lg py-2 z-50">
          <div className="px-4 py-2 border-b border-muted/20">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="text-sm font-medium text-surface truncate" title={sessionLabel}>
              {sessionLabel}
            </p>
          </div>
          <Link
            href="/app/events"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-surface hover:bg-muted/10 sm:hidden"
          >
            <IconList className="w-4 h-4 text-muted" aria-hidden />
            My events
          </Link>
          <Link
            href="/app/account"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-surface hover:bg-muted/10 sm:hidden"
          >
            <IconWallet className="w-4 h-4 text-accent" aria-hidden />
            <span>
              Account
              <span className="text-accent font-medium ml-1">{balanceCompact}</span>
            </span>
          </Link>
          <div className="border-t border-muted/20 my-1 sm:hidden" />
          <Link
            href="/app/profile"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-surface hover:bg-muted/10"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-surface hover:bg-muted/10 font-medium"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
