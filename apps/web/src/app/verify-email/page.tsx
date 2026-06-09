import Link from "next/link";
import { IconWallet } from "@/components/Icons";
import VerifyEmailForm from "./VerifyEmailForm";

export const metadata = {
  title: "Verify email – CeremonyWallet",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main className="min-h-screen bg-light flex flex-col">
      <header className="bg-surface text-light">
        <div className="max-w-lg mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-light hover:text-accent transition-colors"
          >
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-12">
        <h1 className="text-xl font-bold text-surface mb-2">Verify email</h1>
        <p className="text-muted text-sm mb-6">
          Tap the button below to confirm this address. You will then sign in with
          your password.
        </p>
        <VerifyEmailForm token={token} />
      </div>
    </main>
  );
}
