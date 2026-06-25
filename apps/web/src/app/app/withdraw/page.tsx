import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getWalletAccount,
  getPayoutMethods,
  getWithdrawEventOptions,
} from "@/app/actions/wallet";
import WithdrawWizard from "./WithdrawWizard";

export const metadata = {
  title: "Withdraw – CeremonyWallet",
};

export default async function WithdrawPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.accountVerified) redirect("/app/verify-account");

  const { eventId: preselectEventId } = await searchParams;

  const [account, methods, eventOptionsPage] = await Promise.all([
    getWalletAccount(),
    getPayoutMethods(),
    getWithdrawEventOptions(),
  ]);

  return (
    <main className="min-h-screen bg-light pb-24">
      <WithdrawWizard
        initialBalance={account.balance}
        initialMethods={methods}
        initialEventOptions={eventOptionsPage.events}
        preselectEventId={preselectEventId?.trim() || undefined}
        userEmail={user.email}
        methodsReadOnly
      />
    </main>
  );
}
