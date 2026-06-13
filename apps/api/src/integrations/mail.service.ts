import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import type { VerificationReviewImageUrls } from "../verification/verification.types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private transporter() {
    const host = this.config.get<string>("app.smtp.host");
    if (!host) return null;
    this.log.debug(`Creating SMTP transporter for host ${host}`);
    this.log.debug(`SMTP port: ${this.config.get<number>("app.smtp.port") ?? 587}`);
    this.log.debug(`SMTP secure: ${((this.config.get<number>("app.smtp.port") ?? 587) === 465) ? "true" : "false"}`);
    return nodemailer.createTransport({
      host,
      port: this.config.get<number>("app.smtp.port") ?? 587,
      secure: (this.config.get<number>("app.smtp.port") ?? 587) === 465,
      auth: {
        user: this.config.get<string>("app.smtp.user") || undefined,
        pass: this.config.get<string>("app.smtp.pass") || undefined,
      },
    });
  }

  async sendPasswordReset(to: string, resetLink: string): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    if (!t) {
      this.log.log(`Password reset link (no SMTP): ${resetLink}`);
      return;
    }
    this.log.debug(`Sending password reset link to ${to}: ${resetLink}`);
    await t.sendMail({
      from,
      to,
      subject: "Reset your CeremonyWallet password",
      html: `
        <p>You requested a password reset for your CeremonyWallet account.</p>
        <p><a href="${resetLink}">Reset your password</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    });
  }

  async sendEmailVerification(to: string, verifyLink: string): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    if (!t) {
      this.log.log(`Email verification link (no SMTP): ${verifyLink}`);
      return;
    }
    const smtpUser = this.config.get<string>("app.smtp.user") ?? "";
    this.log.debug(
      `Sending email verification link to ${to} via ${this.config.get<string>("app.smtp.host")} (auth user: ${smtpUser || "—"}, from: ${from})`
    );
    await t.sendMail({
      from,
      to,
      subject: "Verify your CeremonyWallet email",
      html: `
        <p>Thanks for signing up. Please confirm your email address to activate your account.</p>
        <p><a href="${verifyLink}">Verify your email</a></p>
        <p>This link expires in 48 hours. If you didn't create an account, you can ignore this email.</p>
      `,
    });
  }

  async sendWithdrawalOtp(
    to: string,
    code: string,
    summary: {
      grossAmount: number;
      netAmount: number;
      methodLabel: string;
      destination: string;
    }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const gross = summary.grossAmount.toLocaleString("en-UG");
    const net = summary.netAmount.toLocaleString("en-UG");
    if (!t) {
      this.log.log(
        `Withdrawal OTP (no SMTP) for ${to}: ${code} — UGX ${gross} to ${summary.methodLabel} (${summary.destination}), you receive UGX ${net}`
      );
      return;
    }
    await t.sendMail({
      from,
      to,
      subject: "CeremonyWallet withdrawal confirmation code",
      html: `
        <p>Your CeremonyWallet withdrawal confirmation code is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
        <p>This code expires in 5 minutes.</p>
        <p><strong>Amount:</strong> UGX ${gross}<br/>
        <strong>You receive:</strong> UGX ${net}<br/>
        <strong>To:</strong> ${summary.methodLabel} · ${summary.destination}</p>
        <p>If you did not request this withdrawal, secure your account immediately.</p>
      `,
    });
  }

  async sendContributionNotification(
    to: string,
    summary: {
      eventTitle: string;
      contributorName: string;
      anonymous: boolean;
      amount: number;
      phone?: string;
      message?: string;
      manual?: boolean;
      viaMobileMoney?: boolean;
      contributionsUrl: string;
    }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const amount = summary.amount.toLocaleString("en-UG");
    const who = summary.anonymous
      ? "Anonymous"
      : summary.contributorName.trim() || "Someone";
    const method = summary.manual
      ? "Recorded manually"
      : summary.viaMobileMoney
        ? "Mobile money"
        : "Payment";
    const phoneLine = summary.phone?.trim()
      ? `<br/><strong>Phone:</strong> ${escapeHtml(summary.phone.trim())}`
      : "";
    const messageLine = summary.message?.trim()
      ? `<p style="margin:12px 0 0;"><em>${escapeHtml(summary.message.trim())}</em></p>`
      : "";
    const eventTitle = escapeHtml(summary.eventTitle.trim() || "Your event");
    const link = escapeHtml(summary.contributionsUrl);

    if (!t) {
      this.log.log(
        `Contribution notification (no SMTP) for ${to}: UGX ${amount} from ${who} — ${summary.contributionsUrl}`
      );
      return;
    }

    await t.sendMail({
      from,
      to,
      subject: `New contribution — ${summary.eventTitle.trim() || "your event"}`,
      html: `
        <p>You received a new contribution on <strong>${eventTitle}</strong>.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <strong>Amount:</strong> UGX ${amount}<br/>
          <strong>From:</strong> ${escapeHtml(who)}<br/>
          <strong>How:</strong> ${escapeHtml(method)}${phoneLine}
        </p>
        ${messageLine}
        <p><a href="${link}">View all contributions</a></p>
        <p style="color:#666;font-size:12px;">CeremonyWallet — contribution notification</p>
      `,
    });
  }

  async sendWithdrawalCompleted(
    to: string,
    summary: {
      reference: string;
      completedAt: string;
      methodLabel: string;
      methodDestination: string;
      grossAmount: number;
      momoFee: number;
      platformFee: number;
      netAmount: number;
      accountUrl: string;
    }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const ugx = (n: number) => n.toLocaleString("en-UG");
    const ref = escapeHtml(summary.reference);
    const when = escapeHtml(summary.completedAt);
    const methodLabel = escapeHtml(summary.methodLabel);
    const destination = escapeHtml(summary.methodDestination);
    const accountUrl = escapeHtml(summary.accountUrl);

    if (!t) {
      this.log.log(
        `Withdrawal completed (no SMTP) for ${to}: ref ${summary.reference} net UGX ${ugx(summary.netAmount)}`
      );
      return;
    }

    await t.sendMail({
      from,
      to,
      subject: `Withdrawal completed — ${summary.reference}`,
      html: `
        <p>Your CeremonyWallet withdrawal has been completed.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <strong>Reference:</strong> ${ref}<br/>
          <strong>Date:</strong> ${when}<br/>
          <strong>Sent to:</strong> ${methodLabel}<br/>
          <strong>Destination:</strong> ${destination}
        </p>
        <table style="width:100%;max-width:360px;border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr>
            <td style="padding:6px 0;color:#666;">Gross amount</td>
            <td style="padding:6px 0;text-align:right;">UGX ${ugx(summary.grossAmount)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Mobile money fee</td>
            <td style="padding:6px 0;text-align:right;">UGX ${ugx(summary.momoFee)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#666;">Platform fee</td>
            <td style="padding:6px 0;text-align:right;">UGX ${ugx(summary.platformFee)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0 6px;border-top:1px solid #ddd;font-weight:bold;color:#3b6d11;">Net received</td>
            <td style="padding:10px 0 6px;border-top:1px solid #ddd;text-align:right;font-weight:bold;color:#3b6d11;">UGX ${ugx(summary.netAmount)}</td>
          </tr>
        </table>
        <p><a href="${accountUrl}">View your account</a></p>
        <p style="color:#666;font-size:12px;">CeremonyWallet — withdrawal confirmation</p>
      `,
    });
  }

  async sendVerificationSubmissionToSupport(
    to: string,
    details: {
      userId: string;
      email: string;
      accountPhone: string | null;
      legalName: string;
      phoneMsisdn: string;
      submittedAt: string;
      reviewUrls: VerificationReviewImageUrls;
    }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const userId = escapeHtml(details.userId);
    const email = escapeHtml(details.email);
    const accountPhone = details.accountPhone?.trim()
      ? escapeHtml(details.accountPhone.trim())
      : "—";
    const legalName = escapeHtml(details.legalName);
    const phoneMsisdn = escapeHtml(details.phoneMsisdn);
    const submittedAt = escapeHtml(details.submittedAt);
    const imageLinks = (["selfie", "idFront", "idBack"] as const)
      .map((slot) => {
        const url = details.reviewUrls[slot];
        if (!url) return `<li>${slot}: unavailable</li>`;
        return `<li><a href="${escapeHtml(url)}">${slot}</a></li>`;
      })
      .join("");

    if (!t) {
      this.log.log(
        `Verification submission (no SMTP) for support ${to}: user ${details.userId} (${details.email})`
      );
      return;
    }

    await t.sendMail({
      from,
      to,
      subject: `Account verification submitted — ${details.legalName}`,
      html: `
        <p>A user submitted account verification documents for review.</p>
        <table style="border-collapse:collapse;font-size:14px;margin:16px 0;">
          <tr><td style="padding:4px 12px 4px 0;color:#666;">User ID</td><td style="padding:4px 0;">${userId}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Account email</td><td style="padding:4px 0;">${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Registered phone</td><td style="padding:4px 0;">${accountPhone}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Legal name (ID)</td><td style="padding:4px 0;"><strong>${legalName}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">MoMo phone (ID)</td><td style="padding:4px 0;"><strong>${phoneMsisdn}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666;">Submitted at</td><td style="padding:4px 0;">${submittedAt}</td></tr>
        </table>
        <p><strong>Review images (8h links):</strong></p>
        <ul>${imageLinks}</ul>
        <p style="color:#666;font-size:12px;">CLI: verify-account show --user-id=${userId}</p>
      `,
    });
  }

  async sendVerificationApproved(
    to: string,
    summary: {
      legalName: string;
      phoneMsisdn: string;
      withdrawUrl: string;
      accountUrl: string;
    }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const legalName = escapeHtml(summary.legalName.trim() || "Account holder");
    const phone = escapeHtml(summary.phoneMsisdn);
    const withdrawUrl = escapeHtml(summary.withdrawUrl);
    const accountUrl = escapeHtml(summary.accountUrl);

    if (!t) {
      this.log.log(
        `Verification approved (no SMTP) for ${to}: ${summary.legalName} · ${summary.phoneMsisdn}`
      );
      return;
    }

    await t.sendMail({
      from,
      to,
      subject: "Your CeremonyWallet account is verified",
      html: `
        <p>Good news — your account verification was approved.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#f4f4f5;border-radius:8px;">
          <strong>Name on file:</strong> ${legalName}<br/>
          <strong>Verified payout phone:</strong> ${phone}
        </p>
        <p>You can now withdraw funds to your verified mobile money number.</p>
        <p><a href="${withdrawUrl}">Withdraw funds</a> · <a href="${accountUrl}">View account</a></p>
        <p style="color:#666;font-size:12px;">CeremonyWallet — account verification</p>
      `,
    });
  }

  async sendVerificationRejected(
    to: string,
    summary: { reason: string; verifyAccountUrl: string }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    const reason = escapeHtml(summary.reason.trim() || "No reason provided.");
    const verifyAccountUrl = escapeHtml(summary.verifyAccountUrl);

    if (!t) {
      this.log.log(
        `Verification rejected (no SMTP) for ${to}: ${summary.reason}`
      );
      return;
    }

    await t.sendMail({
      from,
      to,
      subject: "Action needed — account verification",
      html: `
        <p>We reviewed your account verification submission and could not approve it at this time.</p>
        <p style="margin:16px 0;padding:12px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;">
          <strong>Reason:</strong> ${reason}
        </p>
        <p>You can review the reason and submit again with updated documents.</p>
        <p><a href="${verifyAccountUrl}">Verify my account</a></p>
        <p style="color:#666;font-size:12px;">CeremonyWallet — account verification</p>
      `,
    });
  }

  async sendPayoutMethodOtp(
    to: string,
    code: string,
    summary: { methodLabel: string; destination: string }
  ): Promise<void> {
    const t = this.transporter();
    const from = this.config.get<string>("app.smtp.from") ?? "noreply@localhost";
    if (!t) {
      this.log.log(
        `Payout method OTP (no SMTP) for ${to}: ${code} — add ${summary.methodLabel} · ${summary.destination}`
      );
      return;
    }
    await t.sendMail({
      from,
      to,
      subject: "CeremonyWallet — confirm new payout method",
      html: `
        <p>Your confirmation code to add a payout method is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
        <p>This code expires in 5 minutes.</p>
        <p><strong>Method:</strong> ${summary.methodLabel}<br/>
        <strong>Destination:</strong> ${summary.destination}</p>
        <p>If you did not request this, secure your account immediately.</p>
      `,
    });
  }
}
