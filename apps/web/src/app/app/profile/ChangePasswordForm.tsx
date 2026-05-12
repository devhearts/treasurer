"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePassword } from "@/app/actions/auth";

export default function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const result = await changePassword(currentPassword, newPassword);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
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
      {success && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          Password updated successfully.
        </p>
      )}
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium text-surface mb-1">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          required
          className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-surface mb-1">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 6 characters)"
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
