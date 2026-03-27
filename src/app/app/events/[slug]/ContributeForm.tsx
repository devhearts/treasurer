"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addContribution } from "@/app/actions/events";
import {
  initiateMomoContribution,
  pollMomoContribution,
} from "@/app/actions/momo";
import { IconCopy } from "@/components/Icons";

interface ContributeFormProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  treasurerPhone: string;
  /** Private (app) view: show visible label for contributor name. */
  flow?: "public" | "private";
  momoConfigured?: boolean;
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;

export default function ContributeForm({
  eventSlug,
  eventTitle,
  treasurerPhone,
  flow = "public",
  momoConfigured = false,
}: ContributeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
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
      name,
      anonymous: false,
      amount: Number(amount),
      phone: payerPhone.trim() || "",
      status,
      date: new Date().toISOString().split("T")[0],
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
      setMomoError("Enter the MTN MoMo number that will pay.");
      return;
    }
    setLoading(true);
    const result = await initiateMomoContribution({
      eventSlug,
      amount: Number(amount),
      name,
      payerPhone,
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
            onClick={() => setStep(1)}
            className="text-sm text-accent font-medium mb-4"
          >
            Back
          </button>
          <h2 className="text-lg font-bold text-surface mb-1">Confirm</h2>
          <p className="text-muted text-sm mb-4">
            UGX {numAmount.toLocaleString()} to {eventTitle}
          </p>
          <div className="mb-4">
            {flow === "private" ? (
              <>
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
              </>
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
          </div>

          {momoConfigured && (
            <div className="mb-4">
              <label className="block text-xs text-muted mb-1" htmlFor="payer-phone">
                MTN MoMo number (paying wallet)
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

          <p className="text-xs text-muted mb-2">Pay to treasurer</p>
          <p className="font-bold text-surface mb-4">{treasurerPhone}</p>
          <div className="flex flex-col gap-2">
            {momoConfigured ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void startMomoPay()}
                className="cta-primary w-full text-white disabled:opacity-50"
              >
                {loading ? "Starting…" : "Pay with MTN MoMo"}
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
            <button
              type="button"
              disabled={loading}
              onClick={() => recordContribution("pledged")}
              className="w-full py-3 rounded-lg font-semibold border-2 border-muted/50 text-muted hover:border-muted hover:text-surface transition-colors disabled:opacity-50"
            >
              Pledge (pay later)
            </button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="p-6">
          <h2 className="text-lg font-bold text-surface mb-1">Thank you</h2>
          <p className="text-muted text-sm mb-4">
            {lastStatus === "pledged"
              ? `Your pledge of UGX ${numAmount.toLocaleString()} is recorded. Pay the treasurer via Mobile Money when you're ready.`
              : lastPaidViaMomo
                ? `Your payment of UGX ${numAmount.toLocaleString()} was received via MTN MoMo.`
                : `Your contribution of UGX ${numAmount.toLocaleString()} is recorded. Pay the treasurer via Mobile Money.`}
          </p>
          {name.trim() && (
            <p className="text-sm font-medium text-surface mb-4">
              Recorded as: <span className="text-accent">{name.trim()}</span>
            </p>
          )}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/10 border border-muted/20 mb-4">
            <span className="font-bold text-surface">{treasurerPhone}</span>
            <button
              type="button"
              onClick={copyPhone}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent/90 text-white text-sm font-semibold rounded-lg"
            >
              <IconCopy className="w-4 h-4" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setAmount("");
              setName("");
              setPayerPhone("");
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
