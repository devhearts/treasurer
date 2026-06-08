"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { verifyEmail } from "@/app/actions/auth";

interface VerifyEmailFormProps {
  token: string;
}

export default function VerifyEmailForm({ token }: VerifyEmailFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">Invalid link</p>
        <p className="mt-1">
          This verification link is missing the token.{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">
            Sign in
          </Link>{" "}
          if you already have an account, or register again.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyEmail(token);
    setLoading(false);
    if (result.success) {
      router.refresh();
      router.push("/app");
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={(ev) => void handleSubmit(ev)} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="cta-primary w-full disabled:opacity-50"
      >
        {loading ? "Verifying…" : "Verify and continue"}
      </button>
      <p className="text-center text-sm text-muted">
        <Link href="/login" className="text-accent font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
