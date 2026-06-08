"use client";

import { useState } from "react";
import { resendVerificationEmail } from "@/app/actions/auth";

export default function CheckEmailActions({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResend() {
    setError(null);
    setMessage(null);
    setLoading(true);
    const r = await resendVerificationEmail(email);
    setLoading(false);
    if (r.success) {
      setMessage("If this address has an unverified account, we sent another email.");
    } else {
      setError(r.error);
    }
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={loading || !email}
        onClick={() => void handleResend()}
        className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface font-medium hover:bg-muted/10 disabled:opacity-50"
      >
        {loading ? "Sending…" : "Resend verification email"}
      </button>
    </div>
  );
}
