import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AfricasTalkingService {
  private readonly log = new Logger(AfricasTalkingService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSms(toMsisdn: string, message: string): Promise<void> {
    const username = this.config
      .get<string>("app.africastalking.username")
      ?.trim();
    const apiKey = this.config
      .get<string>("app.africastalking.apiKey")
      ?.trim();
    if (!username || !apiKey) {
      this.log.warn("Africa's Talking not configured; skip SMS");
      return;
    }
    const senderId =
      this.config.get<string>("app.africastalking.senderId")?.trim() || "";
    const body = new URLSearchParams({
      username,
      to: toMsisdn,
      message: message.slice(0, 480),
    });
    if (senderId) body.append("from", senderId);

    const res = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey,
      },
      body: body.toString(),
    });
    if (!res.ok) {
      const t = await res.text();
      this.log.error(`AT SMS failed ${res.status}: ${t.slice(0, 200)}`);
      throw new Error("SMS send failed");
    }
    this.log.log(`AT SMS queued to ***${toMsisdn.slice(-4)}`);
  }
}
