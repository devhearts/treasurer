import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM ?? "CeremonyWallet <onboarding@resend.dev>";

/**
 * Sends a password reset email with the given link.
 * If RESEND_API_KEY is not set, logs the link to the console (for dev).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<{ ok: boolean; error?: string }> {
  if (!resendApiKey) {
    // Dev: log the link so you can click it without configuring email
    console.log("[CeremonyWallet] Password reset link (no RESEND_API_KEY set):", resetLink);
    return { ok: true };
  }
  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject: "Reset your CeremonyWallet password",
      html: `
        <p>You requested a password reset for your CeremonyWallet account.</p>
        <p><a href="${resetLink}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    return { ok: false, error: message };
  }
}
