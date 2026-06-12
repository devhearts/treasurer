import "server-only";
import { serverApiJson } from "./server-api";

import type { AccountVerificationStatus } from "@/lib/verification/types";

export type CurrentUser = {
  id: string;
  email: string;
  emailVerified?: boolean;
  accountVerified?: boolean;
  accountVerificationStatus?: AccountVerificationStatus;
  accountVerificationRejectionReason?: string;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const data = await serverApiJson<{
      user: CurrentUser | null;
    }>("auth/me");
    return data.user;
  } catch {
    return null;
  }
}
