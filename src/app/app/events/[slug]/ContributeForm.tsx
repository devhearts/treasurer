"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addContribution } from "@/app/actions/events";
import { IconCopy } from "@/components/Icons";

interface ContributeFormProps {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  treasurerPhone: string;
  /** Private (app) view: show visible label for contributor name. */
  flow?: "public" | "private";
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000];

export default function ContributeForm({
  eventSlug,
  eventTitle,
  treasurerPhone,
  flow = "public",
}: ContributeFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  /** After step 3: whether the last recorded contribution was pledged (pay later) or paid. */
  const [lastStatus, setLastStatus] = useState<"paid" | "pledged">("paid");

  function copyPhone() {
    navigator.clipboard.writeText(treasurerPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      phone: "",
      status,
      date: new Date().toISOString().split("T")[0],
    });
    setLoading(false);
    if (result.success) {
      setLastStatus(status);
      router.refresh();
      setStep(3);
    } else {
      alert(result.error ?? "Failed to record.");
    }
  }

  const numAmount = Number(amount) || 0;

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
          <p className="text-xs text-muted mb-2">Pay to treasurer</p>
          <p className="font-bold text-surface mb-4">{treasurerPhone}</p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => recordContribution("paid")}
              className="cta-primary w-full text-white disabled:opacity-50"
            >
              {loading ? "Recording…" : <><span className="sm:hidden">Pay now</span><span className="hidden sm:inline">I've paid — record</span></>}
            </button>
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
            onClick={() => { setStep(1); setAmount(""); setName(""); }}
            className="text-sm text-accent font-medium"
          >
            Make another contribution
          </button>
        </div>
      )}
    </div>
  );
}
