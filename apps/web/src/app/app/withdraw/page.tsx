import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import {
  getWalletAccount,
  getPayoutMethods,
} from "@/app/actions/wallet";
import WithdrawWizard from "./WithdrawWizard";

export const metadata = {
  title: "Withdraw – CeremonyWallet",
};

export default async function WithdrawPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.accountVerified) redirect("/app/verify-account");

  const [account, methods] = await Promise.all([
    getWalletAccount(),
    getPayoutMethods(),
  ]);

  return (
    <main className="min-h-screen bg-light pb-24">
      <WithdrawWizard
        initialBalance={account.balance}
        initialMethods={methods}
        userEmail={user.email}
        methodsReadOnly
      />
    </main>
  );
}
