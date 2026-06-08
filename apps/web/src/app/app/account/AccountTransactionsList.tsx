"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadMoreWalletTransactions } from "@/app/actions/wallet";
import type { WalletTransaction } from "@/lib/wallet/types";

function formatTxnTime(createdAt: string): string {
  const d = new Date(createdAt.replace(" ", "T") + "Z");
  const now = new Date();
  const sameDay =
    d.getUTCDate() === now.getUTCDate() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCFullYear() === now.getUTCFullYear();
  const time = d.toLocaleTimeString("en-UG", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const isYesterday =
    d.getUTCDate() === yesterday.getUTCDate() &&
    d.getUTCMonth() === yesterday.getUTCMonth() &&
    d.getUTCFullYear() === yesterday.getUTCFullYear();
  if (isYesterday) return `Yesterday, ${time}`;
  return d.toLocaleDateString("en-UG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TxnCard({ tx }: { tx: WalletTransaction }) {
  const isIn = tx.direction === "in";
  return (
    <div className="bg-light rounded-xl border border-muted/30 p-3.5 flex gap-3">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
          isIn ? "bg-lime/40 text-[#3b6d11]" : "bg-red-100 text-[#a32d2d]"
        }`}
        aria-hidden
      >
        {isIn ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 5L5 19M5 5v14h14" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 19L19 5M19 19V5H5" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2 items-start">
          <div className="min-w-0">
            <p className="text-sm font-medium text-surface truncate">{tx.title}</p>
            {tx.description ? (
              <p className="text-xs text-muted mt-0.5 line-clamp-2">{tx.description}</p>
            ) : null}
          </div>
          <p
            className={`text-sm font-medium flex-shrink-0 ${
              isIn ? "text-[#3b6d11]" : "text-[#a32d2d]"
            }`}
          >
            {isIn ? "+" : "−"}
            {tx.amount.toLocaleString("en-UG")}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center mt-1.5">
          {tx.badge ? (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                isIn ? "bg-lime/40 text-[#3b6d11]" : "bg-red-100 text-[#a32d2d]"
              }`}
            >
              {tx.badge}
            </span>
          ) : null}
          <span className="text-[11px] text-muted">{formatTxnTime(tx.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

interface AccountTransactionsListProps {
  initialTransactions: WalletTransaction[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
}

export default function AccountTransactionsList({
  initialTransactions,
  initialNextCursor,
  initialHasMore,
}: AccountTransactionsListProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [cursor, setCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const page = await loadMoreWalletTransactions(cursor);
      setTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        const added = page.transactions.filter((t) => !seen.has(t.id));
        return [...prev, ...added];
      });
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch {
      setError("Could not load more transactions.");
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "240px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        No transactions yet. Contributions to your events will appear here.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {transactions.map((tx) => (
          <TxnCard key={tx.id} tx={tx} />
        ))}
      </div>
      {hasMore ? (
        <div ref={sentinelRef} className="py-4 flex justify-center" aria-hidden>
          {loading ? (
            <p className="text-xs text-muted">Loading…</p>
          ) : (
            <div className="h-1 w-1" />
          )}
        </div>
      ) : transactions.length > 0 ? (
        <p className="text-center text-[11px] text-muted py-4">End of transactions</p>
      ) : null}
      {error ? (
        <div className="text-center py-2">
          <p className="text-xs text-[#a32d2d]">{error}</p>
          <button
            type="button"
            onClick={() => void loadMore()}
            className="text-xs text-accent hover:underline mt-1"
          >
            Try again
          </button>
        </div>
      ) : null}
    </>
  );
}
