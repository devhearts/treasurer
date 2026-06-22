import Link from "next/link";
import { IconWallet } from "@/components/Icons";
import SiteFooter from "@/components/SiteFooter";
import CheckEmailActions from "./CheckEmailActions";

export const metadata = {
  title: "Check your email – CeremonyWallet",
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = (params.email ?? "").trim();

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
        <h1 className="text-xl font-bold text-surface mb-2">Check your email</h1>
        <p className="text-muted text-sm mb-6">
          {email ? (
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-surface">{email}</span>. Open it
              to activate your account, then you can sign in.
            </>
          ) : (
            <>
              We sent a verification link to your email. Open it to activate your
              account, then you can sign in.
            </>
          )}
        </p>
        <CheckEmailActions email={email} />
        <p className="mt-8 text-center text-sm text-muted">
          <Link href="/login" className="text-accent font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>

      <SiteFooter />
    </main>
  );
}
