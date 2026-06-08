import "server-only";
import { serverApiJson } from "./server-api";

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
  emailVerified?: boolean;
} | null> {
  try {
    const data = await serverApiJson<{
      user: {
        id: string;
        email: string;
        emailVerified?: boolean;
      } | null;
    }>("auth/me");
    return data.user;
  } catch {
    return null;
  }
}
