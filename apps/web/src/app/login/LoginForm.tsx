"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, resendVerificationEmail } from "@/app/actions/auth";

export default function LoginForm({
  showVerified = false,
}: {
  showVerified?: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const showVerifyHelp =
    error?.toLowerCase().includes("verify your email") ?? false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendMessage(null);
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      router.refresh();
      router.push("/app");
    } else {
      setError(result.error);
    }
  }

  async function handleResend() {
    setResendMessage(null);
    setResendLoading(true);
    const r = await resendVerificationEmail(email.trim());
    setResendLoading(false);
    if (r.success) {
      setResendMessage(
        "If this address has an unverified account, we sent another email."
      );
    } else {
      setResendMessage(r.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showVerified && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          Email verified. You can sign in now.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      {showVerifyHelp && (
        <div className="rounded-lg border border-muted/30 bg-light p-4 space-y-2">
          <p className="text-sm text-muted">
            Use the link in your email, or resend the verification message to the
            address you entered above.
          </p>
          <button
            type="button"
            disabled={resendLoading || !email.trim()}
            onClick={() => void handleResend()}
            className="text-sm font-medium text-accent hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Sending…" : "Resend verification email"}
          </button>
          {resendMessage && (
            <p className="text-sm text-surface">{resendMessage}</p>
          )}
        </div>
      )}
      <div>
        <label htmlFor="login-email" className="sr-only">Email</label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="login-password" className="sr-only">Password</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cta-primary w-full disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
