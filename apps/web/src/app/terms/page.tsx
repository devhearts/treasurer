import Link from "next/link";
import { IconWallet } from "@/components/Icons";
import SiteFooter from "@/components/SiteFooter";
import TermsContent from "@/components/legal/TermsContent";

export const metadata = {
  title: "Terms and Conditions – CeremonyWallet",
  description:
    "Terms and Conditions of Use for CeremonyWallet, a digital treasury platform for social events.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-light flex flex-col">
      <header className="bg-surface text-light">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-light hover:text-accent transition-colors"
          >
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
          <Link
            href="/register"
            className="text-sm text-light/90 hover:text-light font-medium shrink-0"
          >
            Sign up
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">
        <TermsContent />
        <p className="mt-10 text-center text-sm text-muted">
          <Link href="/" className="text-accent font-medium hover:underline">
            Back to home
          </Link>
        </p>
      </div>

      <SiteFooter wide />
    </main>
  );
}
