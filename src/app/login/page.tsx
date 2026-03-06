import Link from "next/link";
import { IconWallet } from "@/components/Icons";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Sign in – CeremonyWallet",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const showResetSuccess = params.reset === "1";

  return (
    <main className="min-h-screen bg-light flex flex-col">
      <header className="bg-surface text-light">
        <div className="max-w-lg mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-light hover:text-accent transition-colors">
            <IconWallet className="w-6 h-6 text-accent" />
            <span className="font-semibold text-lg">
              Ceremony<span className="text-accent">Wallet</span>
            </span>
          </Link>
        </div>
      </header>

      <div className="flex-1 max-w-sm mx-auto w-full px-4 py-12">
        <h1 className="text-xl font-bold text-surface mb-2">Sign in</h1>
        <p className="text-muted text-sm mb-6">
          Enter your email and password to access your account.
        </p>
        {showResetSuccess && (
          <p className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            Password reset successfully. You can sign in now.
          </p>
        )}
        <LoginForm />
        <p className="mt-4 text-center text-sm text-muted">
          <Link href="/forgot-password" className="text-accent font-medium hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-accent font-medium hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
