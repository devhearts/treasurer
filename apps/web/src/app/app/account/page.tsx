import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { getWalletAccount, getWalletTransactions } from "@/app/actions/wallet";
import { IconBack } from "@/components/Icons";
import AccountContent from "./AccountContent";

export const metadata = {
  title: "Account – CeremonyWallet",
};

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const [account, transactionsPage] = await Promise.all([
    getWalletAccount(),
    getWalletTransactions(),
  ]);

  return (
    <main className="min-h-screen bg-cream pb-24">
      <div className="bg-surface border-b border-muted/30 sticky top-14 z-40">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-1 text-accent text-sm hover:underline"
          >
            <IconBack className="w-4 h-4" />
            Back
          </Link>
          <h1 className="flex-1 text-center text-light font-medium text-[15px] pr-16">
            Account
          </h1>
        </div>
      </div>
      <AccountContent
        account={account}
        transactions={transactionsPage.transactions}
        transactionsNextCursor={transactionsPage.nextCursor}
        transactionsHasMore={transactionsPage.hasMore}
        accountVerified={!!user.accountVerified}
      />
    </main>
  );
}
