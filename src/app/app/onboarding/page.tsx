import Link from "next/link";
import { IconWallet, IconAdd } from "@/components/Icons";

export const metadata = {
  title: "Get started – CeremonyWallet",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-light flex flex-col">
      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-12 flex flex-col justify-center">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 text-accent mb-6">
            <IconWallet className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface mb-3">
            Welcome to CeremonyWallet
          </h1>
          <p className="text-muted text-sm leading-relaxed max-w-sm mx-auto">
            Create your first event in three short steps. You&apos;ll set the event type, details, and your Mobile Money number—then share the link and start receiving contributions.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/10 border border-muted/20">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex-shrink-0">1</span>
            <div>
              <p className="font-medium text-surface text-sm">Choose event type</p>
              <p className="text-muted text-xs">Wedding, Kwanjula, Mabugo, or other</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/10 border border-muted/20">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex-shrink-0">2</span>
            <div>
              <p className="font-medium text-surface text-sm">Enter details</p>
              <p className="text-muted text-xs">Title, date, location, target amount</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/10 border border-muted/20">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white text-sm font-bold flex-shrink-0">3</span>
            <div>
              <p className="font-medium text-surface text-sm">Add Mobile Money number</p>
              <p className="text-muted text-xs">Where you&apos;ll receive contributions</p>
            </div>
          </div>
        </div>

        <Link
          href="/app/create"
          className="mt-10 cta-primary flex items-center justify-center gap-2 text-white"
        >
          <IconAdd className="w-5 h-5" />
          Create my first event
        </Link>
      </div>
    </main>
  );
}
