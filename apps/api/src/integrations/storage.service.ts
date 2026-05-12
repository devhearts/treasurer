import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class StorageService {
  private readonly log = new Logger(StorageService.name);

  constructor(private readonly config: ConfigService) {}

  private client(): S3Client | null {
    const endpoint = this.config.get<string>("app.garage.endpoint")?.trim();
    if (!endpoint) return null;
    return new S3Client({
      region: this.config.get<string>("app.garage.region") ?? "garage",
      endpoint,
      credentials: {
        accessKeyId: this.config.get<string>("app.garage.accessKey") ?? "",
        secretAccessKey: this.config.get<string>("app.garage.secretKey") ?? "",
      },
      forcePathStyle: true,
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const c = this.client();
    const bucket = this.config.get<string>("app.garage.bucket")?.trim();
    if (!c || !bucket) {
      this.log.warn("Garage not configured; skip putObject");
      return;
    }
    await c.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
  }

  async getSignedGetUrl(key: string, expiresSec = 3600): Promise<string | null> {
    const c = this.client();
    const bucket = this.config.get<string>("app.garage.bucket")?.trim();
    if (!c || !bucket) return null;
    return getSignedUrl(
      c,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresSec }
    );
  }
}
