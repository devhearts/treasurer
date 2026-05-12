import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle, MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");
export type DrizzleDb = MySql2Database<typeof schema>;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const url = config.get<string>("app.databaseUrl");
        if (!url) {
          throw new Error("DATABASE_URL is required (mapped to app.databaseUrl)");
        }
        const pool = mysql.createPool(url);
        return drizzle(pool, { schema, mode: "default" });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
