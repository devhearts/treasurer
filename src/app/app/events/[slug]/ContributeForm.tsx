"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addContribution } from "@/app/actions/events";
import {
  initiateMomoContribution,
  pollMomoContribution,
} from "@/app/actions/momo";
import { IconCopy } from "@/components/Icons";
import { formatCalendarDate } from "@/lib/data";
import MilestoneCardsRow from "@/components/MilestoneCardsRow";
import type { MilestoneItem } from "@/lib/types";

interface ContributeFormProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  treasurerPhone: string;
  milestoneItems?: MilestoneItem[];
  /** Private (app) view: show visible label for contributor name. */
  flow?: "public" | "private";
  momoConfigured?: boolean;
  payButtonLabel?: string;
  payerPhoneLabel?: string;
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;

export default function ContributeForm({
  eventSlug,
  eventTitle,
  treasurerPhone,
  milestoneItems = [],
  flow = "public",
  momoConfigured = false,
  payButtonLabel = "Pay with MTN Momo",
  payerPhoneLabel = "MTN Momo number (paying wallet)",
}: ContributeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [payerPhone, setPayerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  /** After step 3: whether the last recorded contribution was pledged (pay later) or paid. */
  const [lastStatus, setLastStatus] = useState<"paid" | "pledged">("paid");
  /** Last completion was via MoMo (vs manual record). */
  const [lastPaidViaMomo, setLastPaidViaMomo] = useState(false);

  const [momoWait, setMomoWait] = useState(false);
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);
  /** YYYY-MM-DD; only stored when recording a pledge. */
  const [pledgeHopeBy, setPledgeHopeBy] = useState("");
  /** Step 2: first show only "Pledge (pay later)"; then reveal date + Pledge. */
  const [pledgeExpanded, setPledgeExpanded] = useState(false);

  function copyPhone() {
    navigator.clipboard.writeText(treasurerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    if (!momoWait || !momoRef) return;

    let cancelled = false;
    let polls = 0;

    const tick = async () => {
      if (cancelled) return;
      polls += 1;
      if (polls > MOMO_MAX_POLLS) {
        setMomoError(
          "Timed out waiting for approval. If you approved on your phone, refresh this page or contact the treasurer."
        );
        setMomoWait(false);
        setMomoRef(null);
        return;
      }

      const r = await pollMomoContribution(momoRef);
      if (cancelled) return;

      if (r.status === "SUCCESSFUL") {
        setLastStatus("paid");
        setLastPaidViaMomo(true);
        setMomoWait(false);
        setMomoRef(null);
        router.refresh();
        setStep(3);
        return;
      }

      if (r.status === "FAILED") {
        setMomoError(r.message ?? "Payment failed.");
        setMomoWait(false);
        setMomoRef(null);
        return;
      }

      if (r.status === "NOT_FOUND") {
        setMomoError("Payment session expired. Try again.");
        setMomoWait(false);
        setMomoRef(null);
        return;
      }
    };

    void tick();
    const id = window.setInterval(tick, MOMO_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [momoWait, momoRef, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      // Handled by the two buttons (Pay now / Pledge); this submit is for Pay now only.
    }
  }

  async function recordContribution(status: "paid" | "pledged") {
    setLoading(true);
    const result = await addContribution(eventSlug, {
      name: anonymous ? "Anonymous" : name.trim(),
      anonymous,
      amount: Number(amount),
      phone: payerPhone.trim() || "",
      status,
      date: new Date().toISOString().split("T")[0],
      pledgeHopeBy:
        status === "pledged" && pledgeHopeBy.trim()
          ? pledgeHopeBy.trim()
          : undefined,
      milestoneId: selectedMilestoneId ?? undefined,
    });
    setLoading(false);
    if (result.success) {
      setLastStatus(status);
      setLastPaidViaMomo(false);
      router.refresh();
      setStep(3);
    } else {
      alert(result.error ?? "Failed to record.");
    }
  }

  async function startMomoPay() {
    setMomoError(null);
    if (!payerPhone.trim()) {
      setMomoError("Enter the Mobile Money number that will pay.");
      return;
    }
    setLoading(true);
    const result = await initiateMomoContribution({
      eventSlug,
      amount: Number(amount),
      name: anonymous ? "Anonymous" : name.trim(),
      anonymous,
      payerPhone,
      milestoneId: selectedMilestoneId,
    });
    setLoading(false);
    if (!result.success) {
      setMomoError(result.error ?? "Could not start payment.");
      return;
    }
    setMomoRef(result.referenceId);
    setMomoWait(true);
  }

  const numAmount = Number(amount) || 0;

  if (momoWait) {
    return (
      <div className="bg-light rounded-xl border border-muted/30 overflow-hidden p-6">
        <h2 className="text-lg font-bold text-surface mb-1">Approve on your phone</h2>
        <p className="text-muted text-sm mb-4">
          We sent a Mobile Money request for UGX {numAmount.toLocaleString()}. Open the prompt on your phone and enter your PIN to pay.
        </p>
        <div className="flex items-center gap-3 py-6 justify-center">
          <span className="inline-block h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-hidden />
          <span className="text-sm text-muted">Waiting for MTN MoMo…</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setMomoWait(false);
            setMomoRef(null);
          }}
          className="text-sm text-accent font-medium"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
      {milestoneItems.length > 0 && !momoWait && (
        <div className="px-6 pt-6 pb-0">
          <MilestoneCardsRow
            items={milestoneItems}
            selectedId={selectedMilestoneId}
            onSelect={setSelectedMilestoneId}
          />
        </div>
      )}
      {step === 1 && (
        <form onSubmit={handleSubmit} className="p-6">
          <h2 className="text-lg font-bold text-surface mb-1">How much?</h2>
          <p className="text-muted text-sm mb-4">Choose or enter amount (UGX).</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(String(val))}
                className={`py-3 rounded-lg text-sm font-semibold border transition-colors ${
                  amount === String(val)
                    ? "bg-accent text-white border-accent"
                    : "border-muted/30 text-muted hover:border-muted"
                }`}
              >
                {val.toLocaleString()}
              </button>
            ))}
          </div>
          <label className="sr-only">Amount (UGX)</label>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Or enter amount"
            required
            min={1000}
            className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent mb-6"
          />
          <button type="submit" className="cta-primary w-full">
            Continue
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="p-6">
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setPledgeExpanded(false);
              setPledgeHopeBy("");
            }}
            className="text-sm text-accent font-medium mb-4"
          >
            Back
          </button>
          <h2 className="text-lg font-bold text-surface mb-1">Confirm</h2>
          <p className="text-muted text-sm mb-4">
            UGX {numAmount.toLocaleString()} to {eventTitle}
          </p>
          <div className="mb-4 space-y-3">
            {!anonymous && (
              <>
                {flow === "private" ? (
                  <input
                    id="contributor-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    autoComplete="name"
                    className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                ) : (
                  <>
                    <label className="sr-only" htmlFor="contributor-name-public">
                      Your name
                    </label>
                    <input
                      id="contributor-name-public"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                      className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </>
                )}
              </>
            )}
            <label className="flex items-start gap-3 cursor-pointer text-sm text-surface">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => {
                  const on = e.target.checked;
                  setAnonymous(on);
                  if (on) setName("");
                }}
                className="mt-0.5 h-4 w-4 rounded border-muted/50 text-accent focus:ring-accent"
              />
              <span>
                Contribute anonymously.
              </span>
            </label>
          </div>

          {momoConfigured && (
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1" htmlFor="payer-phone">
                {payerPhoneLabel}
              </label>
              <input
                id="payer-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="e.g. 077xxxxxxx"
                className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          )}

          {momoError && (
            <p className="text-sm text-red-600 mb-3" role="alert">
              {momoError}
            </p>
          )}

          <div className="flex flex-col gap-2">
            {momoConfigured ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void startMomoPay()}
                className="cta-primary w-full text-white disabled:opacity-50"
              >
                {loading ? "Starting…" : payButtonLabel}
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={() => recordContribution("paid")}
                className="cta-primary w-full text-white disabled:opacity-50"
              >
                {loading ? "Recording…" : <><span className="sm:hidden">Pay now</span><span className="hidden sm:inline">I&apos;ve paid — record</span></>}
              </button>
            )}
            <div className="rounded-lg border border-muted/20 bg-muted/5 p-3">
              {!pledgeExpanded ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setPledgeExpanded(true)}
                  className="w-full py-3 rounded-lg font-semibold border-2 border-muted/50 text-muted hover:border-muted hover:text-surface transition-colors disabled:opacity-50"
                >
                  Pledge (pay later)
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                  <div className="min-w-0 flex-1 space-y-1">
                    <label
                      className="block text-xs text-muted"
                      htmlFor="pledge-hope-by"
                    >
                      Hope to pay by (optional)
                    </label>
                    <input
                      id="pledge-hope-by"
                      type="date"
                      value={pledgeHopeBy}
                      onChange={(e) => setPledgeHopeBy(e.target.value)}
                      className="w-full border border-muted/50 rounded-lg px-3 py-2 text-sm text-surface focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => recordContribution("pledged")}
                    className="shrink-0 w-full sm:w-auto py-3 px-4 rounded-lg font-semibold border-2 border-muted/50 text-muted hover:border-muted hover:text-surface transition-colors disabled:opacity-50"
                  >
                    Pledge
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="p-6">
          <h2 className="text-lg font-bold text-surface mb-1">Thank you</h2>
          <p className="text-muted text-sm mb-4">
            {lastStatus === "pledged"
              ? `Your pledge of UGX ${numAmount.toLocaleString()} is recorded.${pledgeHopeBy.trim() ? ` You noted hoping to pay by ${formatCalendarDate(pledgeHopeBy, "long")}.` : ""} Pay the treasurer via Mobile Money when you're ready.`
              : lastPaidViaMomo
                ? `Your payment of UGX ${numAmount.toLocaleString()} was received via MTN MoMo.`
                : `Your contribution of UGX ${numAmount.toLocaleString()} is recorded. Pay the treasurer via Mobile Money.`}
          </p>
          {anonymous ? (
            <p className="text-sm font-medium text-surface mb-4">
              Recorded anonymously.
            </p>
          ) : (
            name.trim() && (
              <p className="text-sm font-medium text-surface mb-4">
                Recorded as: <span className="text-accent">{name.trim()}</span>
              </p>
            )
          )}
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setAmount("");
              setName("");
              setAnonymous(false);
              setPayerPhone("");
              setPledgeHopeBy("");
              setPledgeExpanded(false);
              setMomoError(null);
            }}
            className="text-sm text-accent font-medium"
          >
            Make another contribution
          </button>
        </div>
      )}
    </div>
  );
}
