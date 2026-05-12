"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";

interface ResetPasswordFormProps {
  token: string;
}

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-medium">Invalid link</p>
        <p className="mt-1">
          This reset link is missing the token. Please request a new link from{" "}
          <Link href="/forgot-password" className="text-accent font-medium hover:underline">
            Forgot password
          </Link>
          .
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const result = await resetPassword(token, newPassword);
    setLoading(false);
    if (result.success) {
      router.push("/login?reset=1");
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-surface mb-1">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Min 6 characters"
          required
          minLength={6}
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-surface mb-1">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
          minLength={6}
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="cta-primary w-full disabled:opacity-50"
      >
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
