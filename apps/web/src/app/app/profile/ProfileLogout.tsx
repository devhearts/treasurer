"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/app/actions/auth";

export default function ProfileLogout() {
  const router = useRouter();

  async function handleLogout() {
    await clearSession();
    router.refresh();
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="w-full py-3 rounded-lg border-2 border-muted/50 text-muted font-semibold hover:border-muted hover:text-surface transition-colors"
    >
      Log out
    </button>
  );
}
