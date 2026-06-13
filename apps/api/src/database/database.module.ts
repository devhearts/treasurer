import {
  Global,
  Inject,
  Injectable,
  Module,
  OnApplicationShutdown,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");
export const MYSQL_POOL = Symbol("MYSQL_POOL");
export type DrizzleDb = MySql2Database<typeof schema>;

@Injectable()
class DatabaseShutdownService implements OnApplicationShutdown {
  constructor(@Inject(MYSQL_POOL) private readonly pool: mysql.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MYSQL_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("app.databaseUrl");
        if (!url) {
          throw new Error("DATABASE_URL is required (mapped to app.databaseUrl)");
        }
        return mysql.createPool(url);
      },
    },
    {
      provide: DRIZZLE,
      inject: [MYSQL_POOL],
      useFactory: (pool: mysql.Pool) =>
        drizzle(pool, { schema, mode: "default" }),
    },
    DatabaseShutdownService,
  ],
  exports: [DRIZZLE, MYSQL_POOL],
})
export class DatabaseModule {}
