import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

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
    this.log.debug(`SMTP user: ${this.config.get<string>("app.smtp.user") || undefined}`);
    this.log.debug(`SMTP pass: ${this.config.get<string>("app.smtp.pass") || undefined}`);
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
    this.log.debug(`Sending email verification link to ${to}: ${verifyLink} using smtp user ${from}`);
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
}
