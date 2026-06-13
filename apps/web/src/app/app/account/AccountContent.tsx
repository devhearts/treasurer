import Link from "next/link";
import { formatUGX } from "@/lib/data";
import type {
  WalletAccountSummary,
  WalletTransaction,
} from "@/lib/wallet/types";
import AccountTransactionsList from "./AccountTransactionsList";

export interface AccountEventFilterOption {
  id: string;
  title: string;
}

interface AccountContentProps {
  account: WalletAccountSummary;
  transactions: WalletTransaction[];
  transactionsNextCursor: string | null;
  transactionsHasMore: boolean;
  accountVerified: boolean;
  eventFilterOptions: AccountEventFilterOption[];
}

export default function AccountContent({
  account,
  transactions,
  transactionsNextCursor,
  transactionsHasMore,
  accountVerified,
  eventFilterOptions,
}: AccountContentProps) {
  return (
    <>
      <section className="bg-surface text-light px-5 pt-6 pb-8 text-center">
        <p className="text-accent text-xs uppercase tracking-wider font-medium">
          Total balance
        </p>
        <p className="text-4xl font-medium mt-1.5">
          {formatUGX(account.balance)}
        </p>
        <p className="text-sm text-light/60 mt-1">{account.currency}</p>
        <div className="flex justify-center gap-8 mt-4">
          <div>
            <p className="text-[11px] text-light/60">In</p>
            <p className="text-sm font-medium text-accent">
              +{account.totalIn.toLocaleString("en-UG")}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-light/60">Out</p>
            <p className="text-sm font-medium text-[#e07b6a]">
              −{account.totalOut.toLocaleString("en-UG")}
            </p>
          </div>
        </div>
        {accountVerified ? (
          <Link
            href="/app/withdraw"
            className="inline-flex items-center gap-2 mt-5 bg-accent hover:bg-accent/90 text-white font-medium text-sm px-9 py-3 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
            Withdraw
          </Link>
        ) : (
          <Link
            href="/app/verify-account"
            className="inline-flex items-center gap-2 mt-5 bg-muted/30 hover:bg-muted/40 text-light font-medium text-sm px-9 py-3 rounded-lg transition-colors"
          >
            Verify my account
          </Link>
        )}
      </section>

      <section className="px-4 py-4 max-w-lg mx-auto w-full">
        <AccountTransactionsList
          initialTransactions={transactions}
          initialNextCursor={transactionsNextCursor}
          initialHasMore={transactionsHasMore}
          eventFilterOptions={eventFilterOptions}
        />
      </section>
    </>
  );
}
