"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  serverApiFetch,
  serverApiFetchInternal,
  serverApiJson,
} from "@/lib/server-api";
import { getCurrentUser as loadCurrentUser } from "@/lib/auth-server";

const SESSION_COOKIE = "cerw_session";

export async function getSession(): Promise<string | undefined> {
  const u = await loadCurrentUser();
  return u?.id;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  emailVerified?: boolean;
} | null> {
  return loadCurrentUser();
}

export async function clearSession() {
  try {
    await serverApiFetch("auth/logout", { method: "POST" });
  } catch {
    /* API down or unreachable (e.g. Docker DNS if `api` is not running); still clear cookie. */
  }
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export type RegisterResult =
  | { success: true; email: string }
  | { success: false; error: string };

export async function register(
  email: string,
  password: string,
  confirmPassword: string,
  phone: string,
  acceptTerms: boolean
): Promise<RegisterResult> {
  try {
    const res = await serverApiFetchInternal("auth/register", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        confirmPassword,
        phone,
        acceptTerms,
      }),
    });
    const data = (await res.json()) as {
      message?: string;
      user?: { id: string; email: string };
    };
    if (!res.ok) {
      return { success: false, error: data.message ?? "Registration failed." };
    }
    const registeredEmail = data.user?.email ?? email.trim().toLowerCase();
    return { success: true, email: registeredEmail };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Registration failed.",
    };
  }
}

export type VerifyEmailResult =
  | { success: true }
  | { success: false; error: string };

export async function verifyEmail(token: string): Promise<VerifyEmailResult> {
  try {
    const res = await serverApiFetchInternal("auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      return {
        success: false,
        error: data.message ?? "Verification failed.",
      };
    }
    const sid = res.headers.get("x-set-session");
    if (sid?.trim()) {
      const c = await cookies();
      c.set(SESSION_COOKIE, sid.trim(), {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Verification failed.",
    };
  }
}

export async function resendVerificationEmail(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const res = await serverApiFetchInternal("auth/email/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { message?: string };
      return {
        success: false,
        error: data.message ?? "Could not send email.",
      };
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not send email.",
    };
  }
}

export type LoginResult =
  | { success: true }
  | { success: false; error: string };

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  try {
    const res = await serverApiFetchInternal("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as { message?: string };
    if (!res.ok) {
      return { success: false, error: data.message ?? "Login failed." };
    }
    const sid = res.headers.get("x-set-session");
    if (sid?.trim()) {
      const c = await cookies();
      c.set(SESSION_COOKIE, sid.trim(), {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Login failed.",
    };
  }
}

export type ChangePasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "You must be signed in." };
  }
  try {
    await serverApiJson("auth/password/change", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to change password.",
    };
  }
}

export type RequestPasswordResetResult =
  | { success: true }
  | { success: false; error: string };

export async function requestPasswordReset(
  email: string
): Promise<RequestPasswordResetResult> {
  try {
    await serverApiFetchInternal("auth/password/request-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to send email.",
    };
  }
}

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: string };

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<ResetPasswordResult> {
  try {
    await serverApiFetchInternal("auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Reset failed.",
    };
  }
}
