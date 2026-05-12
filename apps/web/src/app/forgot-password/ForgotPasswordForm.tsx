"use client";

import { useState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await requestPasswordReset(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error);
    }
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-muted/30 bg-muted/5 p-4 text-sm text-surface">
        <p className="font-medium mb-1">Check your email</p>
        <p className="text-muted">
          If an account exists for {email}, we&apos;ve sent a password reset link.
          The link expires in 1 hour.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="forgot-email" className="sr-only">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cta-primary w-full disabled:opacity-50"
      >
        {loading ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
