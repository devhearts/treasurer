"use server";

import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  getUserByEmail,
  getUserById,
  createUser,
  updateUserPassword,
  createPasswordResetToken,
  getPasswordResetByTokenHash,
  deletePasswordResetTokenByTokenHash,
} from "@/lib/db/queries";
import { sendPasswordResetEmail } from "@/lib/email";

const SESSION_COOKIE = "cerw_session";
const SALT_ROUNDS = 10;

export async function setSession(userId: string) {
  const c = await cookies();
  c.set(SESSION_COOKIE, userId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

export async function clearSession() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

/** Returns current user id if logged in. */
export async function getSession(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value;
}

/** Returns current user { id, email } or null. */
export async function getCurrentUser(): Promise<
  { id: string; email: string } | null
> {
  const userId = await getSession();
  if (!userId) return null;
  const user = getUserById(userId);
  return user ?? null;
}

export type RegisterResult =
  | { success: true }
  | { success: false; error: string };

export async function register(
  email: string,
  password: string
): Promise<RegisterResult> {
  const trimmed = email.toLowerCase().trim();
  if (!trimmed || !password) {
    return { success: false, error: "Email and password are required." };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  const existing = getUserByEmail(trimmed);
  if (existing) {
    return { success: false, error: "An account with this email already exists." };
  }
  const id = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const createdAt = new Date().toISOString();
  createUser({ id, email: trimmed, passwordHash, createdAt });
  await setSession(id);
  return { success: true };
}

export type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  const trimmed = email.toLowerCase().trim();
  if (!trimmed || !password) {
    return { success: false, error: "Email and password are required." };
  }
  const user = getUserByEmail(trimmed);
  if (!user) {
    return { success: false, error: "Invalid email or password." };
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return { success: false, error: "Invalid email or password." };
  }
  await setSession(user.id);
  return { success: true };
}

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const userId = await getSession();
  if (!userId) {
    return { success: false, error: "You must be signed in." };
  }
  const user = getUserById(userId);
  if (!user) {
    return { success: false, error: "User not found." };
  }
  const fullUser = getUserByEmail(user.email);
  if (!fullUser) {
    return { success: false, error: "User not found." };
  }
  const ok = await bcrypt.compare(currentPassword, fullUser.passwordHash);
  if (!ok) {
    return { success: false, error: "Current password is incorrect." };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "New password must be at least 6 characters." };
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  updateUserPassword(userId, passwordHash);
  return { success: true };
}

const RESET_TOKEN_EXPIRY_HOURS = 1;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export type RequestPasswordResetResult =
  | { success: true }
  | { success: false; error: string };

export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  const trimmed = email.toLowerCase().trim();
  if (!trimmed) {
    return { success: false, error: "Email is required." };
  }
  const user = getUserByEmail(trimmed);
  // Always return success to avoid leaking whether email exists
  if (!user) {
    return { success: true };
  }
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  createPasswordResetToken(user.id, tokenHash, expiresAt);
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const sendResult = await sendPasswordResetEmail(user.email, resetLink);
  if (!sendResult.ok) {
    return { success: false, error: sendResult.error ?? "Failed to send email." };
  }
  return { success: true };
}

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  if (!token || !token.trim()) {
    return { success: false, error: "Invalid or expired reset link." };
  }
  if (newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }
  const tokenHash = hashToken(token.trim());
  const row = getPasswordResetByTokenHash(tokenHash);
  if (!row) {
    return { success: false, error: "Invalid or expired reset link." };
  }
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  updateUserPassword(row.userId, passwordHash);
  deletePasswordResetTokenByTokenHash(tokenHash);
  return { success: true };
}
