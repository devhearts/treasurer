import Link from "next/link";
import { IconWallet } from "@/components/Icons";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Sign up – CeremonyWallet",
};

export default function RegisterPage() {
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
        <h1 className="text-xl font-bold text-surface mb-2">Sign up</h1>
        <p className="text-muted text-sm mb-6">
          Create an account to start managing your events.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
