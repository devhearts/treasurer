import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes, randomUUID } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import * as bcrypt from "bcryptjs";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { SessionService } from "./session.service";
import { MailService } from "../integrations/mail.service";
import { formatMysqlDateTimeUtc } from "../common/mysql-datetime";
import { normalizeUgandaMsisdnForNetworks } from "../payments/phone";

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_HOURS = 1;
const EMAIL_VERIFY_TOKEN_EXPIRY_HOURS = 48;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function publicAppBaseUrl(config: ConfigService): string {
  return (
    config.get<string>("app.nextPublicAppUrl")?.trim() ||
    config.get<string>("app.webOrigin")?.trim() ||
    "http://localhost:3000"
  );
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly sessions: SessionService,
    private readonly mail: MailService,
    private readonly config: ConfigService
  ) {}

  async register(
    email: string,
    password: string,
    confirmPassword: string,
    phoneRaw: string,
    acceptTerms: boolean,
    _ip?: string,
    _ua?: string
  ): Promise<{ userId: string; email: string }> {
    if (!acceptTerms) {
      throw new BadRequestException(
        "You must accept the Terms and Conditions to create an account."
      );
    }
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !password) {
      throw new BadRequestException("Email and password are required.");
    }
    if (password !== confirmPassword) {
      throw new BadRequestException("Passwords do not match.");
    }
    if (password.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters.");
    }
    const phone = normalizeUgandaMsisdnForNetworks(phoneRaw, ["mtn", "airtel"]);
    if (!phone) {
      throw new BadRequestException(
        "Enter a valid MTN or Airtel Uganda number (e.g. 07… or 256…)."
      );
    }
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmed))
      .limit(1);
    if (existing.length) {
      throw new BadRequestException("An account with this email already exists.");
    }
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const createdAt = formatMysqlDateTimeUtc(new Date());
    await this.db.insert(schema.users).values({
      id,
      email: trimmed,
      passwordHash,
      createdAt,
      phone,
    });
    await this.issueEmailVerification(id, trimmed);
    return { userId: id, email: trimmed };
  }

  async login(
    email: string,
    password: string,
    ip?: string,
    ua?: string
  ): Promise<{ userId: string; sessionId: string; email: string }> {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed || !password) {
      throw new BadRequestException("Email and password are required.");
    }
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmed))
      .limit(1);
    const user = rows[0];
    if (!user) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Invalid email or password.");
    }
    if (!user.emailVerifiedAt) {
      throw new UnauthorizedException(
        "Please verify your email before signing in."
      );
    }
    const sessionId = await this.sessions.createSession(user.id, ip, ua);
    return { userId: user.id, sessionId, email: user.email };
  }

  async me(userId: string): Promise<{
    id: string;
    email: string;
    emailVerified: boolean;
  } | null> {
    const rows = await this.db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        emailVerifiedAt: schema.users.emailVerifiedAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const u = rows[0];
    if (!u) return null;
    return {
      id: u.id,
      email: u.email,
      emailVerified: !!u.emailVerifiedAt,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1);
    const user = rows[0];
    if (!user) throw new BadRequestException("User not found.");
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException("Current password is incorrect.");
    if (newPassword.length < 6) {
      throw new BadRequestException(
        "New password must be at least 6 characters."
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, userId));
  }

  async requestPasswordReset(email: string): Promise<void> {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) return;
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmed))
      .limit(1);
    const user = rows[0];
    if (!user) return;
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = formatMysqlDateTimeUtc(
      new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)
    );
    await this.db.insert(schema.passwordResetTokens).values({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });
    const baseUrl = publicAppBaseUrl(this.config).replace(/\/+$/, "");
    const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
    await this.mail.sendPasswordReset(user.email, resetLink);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token?.trim()) {
      throw new BadRequestException("Invalid or expired reset link.");
    }
    if (newPassword.length < 6) {
      throw new BadRequestException("Password must be at least 6 characters.");
    }
    const tokenHash = hashToken(token.trim());
    const nowIso = formatMysqlDateTimeUtc(new Date());
    const rows2 = await this.db
      .select({ userId: schema.passwordResetTokens.userId })
      .from(schema.passwordResetTokens)
      .where(
        and(
          eq(schema.passwordResetTokens.tokenHash, tokenHash),
          gt(schema.passwordResetTokens.expiresAt, nowIso)
        )
      )
      .limit(1);
    const row = rows2[0];
    if (!row) {
      throw new BadRequestException("Invalid or expired reset link.");
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.db
      .update(schema.users)
      .set({ passwordHash })
      .where(eq(schema.users.id, row.userId));
    await this.db
      .delete(schema.passwordResetTokens)
      .where(eq(schema.passwordResetTokens.tokenHash, tokenHash));
  }

  private async issueEmailVerification(
    userId: string,
    email: string
  ): Promise<void> {
    await this.db
      .delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.userId, userId));
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = formatMysqlDateTimeUtc(
      new Date(
        Date.now() + EMAIL_VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
      )
    );
    await this.db.insert(schema.emailVerificationTokens).values({
      id: randomUUID(),
      userId,
      tokenHash,
      expiresAt,
    });
    const baseUrl = publicAppBaseUrl(this.config).replace(/\/+$/, "");
    const verifyLink = `${baseUrl}/verify-email?token=${encodeURIComponent(rawToken)}`;
    await this.mail.sendEmailVerification(email, verifyLink);
  }

  async verifyEmail(
    token: string,
    _ip?: string,
    _ua?: string
  ): Promise<{ userId: string; email: string }> {
    if (!token?.trim()) {
      throw new BadRequestException("Invalid or expired verification link.");
    }
    const tokenHash = hashToken(token.trim());
    const nowIso = formatMysqlDateTimeUtc(new Date());
    const tokRows = await this.db
      .select({
        userId: schema.emailVerificationTokens.userId,
      })
      .from(schema.emailVerificationTokens)
      .where(
        and(
          eq(schema.emailVerificationTokens.tokenHash, tokenHash),
          gt(schema.emailVerificationTokens.expiresAt, nowIso)
        )
      )
      .limit(1);
    const tok = tokRows[0];
    if (!tok) {
      throw new BadRequestException("Invalid or expired verification link.");
    }
    const userRows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, tok.userId))
      .limit(1);
    const user = userRows[0];
    if (!user) {
      throw new BadRequestException("Invalid or expired verification link.");
    }
    if (user.emailVerifiedAt) {
      await this.db
        .delete(schema.emailVerificationTokens)
        .where(eq(schema.emailVerificationTokens.userId, user.id));
      return { userId: user.id, email: user.email };
    }
    const verifiedAt = formatMysqlDateTimeUtc(new Date());
    await this.db
      .update(schema.users)
      .set({ emailVerifiedAt: verifiedAt })
      .where(eq(schema.users.id, user.id));
    await this.db
      .delete(schema.emailVerificationTokens)
      .where(eq(schema.emailVerificationTokens.userId, user.id));
    return { userId: user.id, email: user.email };
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const trimmed = email.toLowerCase().trim();
    if (!trimmed) return;
    const rows = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, trimmed))
      .limit(1);
    const user = rows[0];
    if (!user || user.emailVerifiedAt) return;
    await this.issueEmailVerification(user.id, user.email);
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.destroy(sessionId);
  }
}
