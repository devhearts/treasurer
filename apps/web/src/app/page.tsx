import Link from "next/link";
import { IconWallet } from "@/components/Icons";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-light flex flex-col">
      <header className="bg-surface text-light">
        <div className="max-w-lg mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-light hover:text-accent transition-colors">
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-light/90 hover:text-light font-medium"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className="flex-1 max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-surface leading-tight mb-3">
          The Transparent Treasurer
          <span className="block text-accent">for Every Ceremony</span>
        </h1>
        <p className="text-muted text-sm mb-10">
          Track contributions for weddings, kwanjula, and mabugo. Making fundraising seamless.
        </p>
        <Link
          href="/register"
          className="cta-primary block text-center max-w-xs mx-auto"
        >
          Get started
        </Link>
        <p className="mt-4 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </section>

      <footer className="bg-surface text-light/70 py-6 mt-auto">
        <div className="max-w-lg mx-auto px-4 text-center text-sm space-y-2">
          <p>
            <span className="font-semibold text-light">CeremonyWallet</span>
            <span className="mx-2">·</span>
            <span>Making fundraising seamless.</span>
          </p>
          <p>
            <Link href="/terms" className="text-light/90 hover:text-light hover:underline">
              Terms and Conditions
            </Link>
          </p>
        </div>
      </footer>
    </main>
  );
}
