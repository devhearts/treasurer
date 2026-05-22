import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { eq } from "drizzle-orm";
import type { DrizzleDb } from "../database/database.module";
import { DRIZZLE } from "../database/database.module";
import * as schema from "../database/schema";
import { MailService } from "./mail.service";

export type PaidContributionNotifyInput = {
  ownerUserId: string | null | undefined;
  eventSlug: string;
  eventTitle: string;
  contributorName: string;
  anonymous: boolean;
  amount: number;
  phone?: string;
  message?: string;
  /** Treasurer-recorded cash/off-app payment */
  manual?: boolean;
  /** MoMo / PawaPay vs manual */
  viaMobileMoney?: boolean;
};

@Injectable()
export class ContributionNotificationsService {
  private readonly log = new Logger(ContributionNotificationsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly mail: MailService,
    private readonly config: ConfigService
  ) {}

  /** Notify event owner by email; never throws (logs failures). */
  notifyPaidContribution(input: PaidContributionNotifyInput): void {
    void this.send(input).catch((err) => {
      this.log.warn(
        `Contribution notification failed for event ${input.eventSlug}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    });
  }

  private appBaseUrl(): string {
    const pub = this.config.get<string>("app.nextPublicAppUrl")?.trim();
    if (pub) return pub.replace(/\/$/, "");
    const web = this.config.get<string>("app.webOrigin")?.trim();
    return (web || "http://localhost:3000").replace(/\/$/, "");
  }

  private async send(input: PaidContributionNotifyInput): Promise<void> {
    const ownerId = input.ownerUserId?.trim();
    if (!ownerId) return;

    const userRows = await this.db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, ownerId))
      .limit(1);
    const to = userRows[0]?.email?.trim();
    if (!to) return;

    const contributionsUrl = `${this.appBaseUrl()}/app/events/${encodeURIComponent(input.eventSlug)}/contributions`;

    await this.mail.sendContributionNotification(to, {
      eventTitle: input.eventTitle,
      contributorName: input.contributorName,
      anonymous: input.anonymous,
      amount: input.amount,
      phone: input.phone,
      message: input.message,
      manual: input.manual,
      viaMobileMoney: input.viaMobileMoney,
      contributionsUrl,
    });
  }
}
