"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EventType } from "@/lib/types";
import { addEvent } from "@/app/actions/events";
import {
  initiateSubscriptionPayment,
  pollSubscriptionPayment,
} from "@/app/actions/momo";
import { EventTypeIcon, IconWallet } from "@/components/Icons";
import FloatingLabelInput from "@/components/FloatingLabelInput";

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "introduction", label: "Kwanjula" },
  { value: "funeral", label: "Mabugo" },
  { value: "other", label: "Other" },
];

const SUBSCRIPTION_FEE = 10000;

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;

const GRID = "gap-4";

export default function CreateEventForm({
  momoConfigured = false,
}: {
  momoConfigured?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<EventType | null>(null);
  const [title, setTitle] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [treasurerPhone, setTreasurerPhone] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [description, setDescription] = useState("");
  const [showDescription, setShowDescription] = useState(false);

  const [subPhone, setSubPhone] = useState("");
  const [momoWait, setMomoWait] = useState(false);
  const [momoRef, setMomoRef] = useState<string | null>(null);
  const [momoError, setMomoError] = useState<string | null>(null);
  const [subscriptionPaid, setSubscriptionPaid] = useState(false);

  useEffect(() => {
    if (!momoWait || !momoRef) return;

    let cancelled = false;
    let polls = 0;

    const tick = async () => {
      if (cancelled) return;
      polls += 1;
      if (polls > MOMO_MAX_POLLS) {
        setMomoError("Timed out waiting for approval. Please try again.");
        setMomoWait(false);
        setMomoRef(null);
        return;
      }

      const r = await pollSubscriptionPayment(momoRef);
      if (cancelled) return;

      if (r.status === "SUCCESSFUL") {
        setSubscriptionPaid(true);
        setMomoWait(false);
        setMomoRef(null);
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
  }, [momoWait, momoRef]);

  async function startSubMomoPay() {
    setMomoError(null);
    const phone = subPhone.trim() || treasurerPhone.trim();
    if (!phone) {
      setMomoError("Enter the MTN MoMo number that will pay.");
      return;
    }
    setLoading(true);
    const result = await initiateSubscriptionPayment({ payerPhone: phone });
    setLoading(false);
    if (!result.success) {
      setMomoError(result.error ?? "Could not start payment.");
      return;
    }
    setMomoRef(result.referenceId);
    setMomoWait(true);
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const slug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 50) || "new-event";
    const target = Number(targetAmount) || 0;
    const newEvent = {
      id: String(Date.now()),
      slug,
      title,
      type: type ?? "wedding",
      organizer,
      treasurerPhone,
      description,
      targetAmount: target,
      raisedAmount: 0,
      date,
      location,
      subscriptionPaid: true,
      budgetItems:
        target > 0
          ? [{ id: "target", name: "Target", amount: target }]
          : [],
      milestoneItems: [],
      contributions: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    const result = await addEvent(newEvent);
    setLoading(false);
    if (result.success) {
      router.push(`/app/events/${result.slug}`);
    } else {
      alert(result.error ?? "Failed to create event.");
    }
  }

  const typeLabel = type ? EVENT_TYPES.find((t) => t.value === type)?.label : "";

  return (
    <div className={GRID}>
      {/* Single progress line + back when step > 1 */}
      <div className="flex items-center justify-between">
        <p className="text-muted text-sm">
          Step {step} of 3
        </p>
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            className="text-sm text-accent font-medium hover:underline"
          >
            Back
          </button>
        )}
      </div>

      {/* Step 1: Select Event Type */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (type) setStep(2);
          }}
          className={GRID}
        >
          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6">
              <h1 className="text-xl font-bold text-surface mb-1">
                What&apos;s the occasion?
              </h1>
              <p className="text-muted text-sm mb-6">
                Choose one. You can change this later.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {EVENT_TYPES.map((et) => (
                  <button
                    key={et.value}
                    type="button"
                    onClick={() => setType(et.value)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left min-h-[56px] ${
                      type === et.value
? "border-accent bg-accent/10 text-surface"
                        : "border-muted/30 hover:border-muted text-surface"
                  }`}
                >
                  <EventTypeIcon
                    type={et.value}
                    className="w-6 h-6 text-accent flex-shrink-0"
                  />
                  <span className={`font-semibold text-sm ${type === et.value ? "text-surface" : "text-muted"}`}>
                    {et.label}
                  </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                disabled={!type}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 2: Add Basic Details */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setStep(3);
          }}
          className={GRID}
        >
          {/* Collapsed Step 1 summary */}
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
          >
            <span className="flex items-center gap-3">
              <EventTypeIcon type={type ?? "wedding"} className="w-5 h-5 text-accent" />
              <span className="font-medium text-surface">{typeLabel}</span>
            </span>
            <span className="text-sm text-accent">Change</span>
          </button>

          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <h1 className="text-xl font-bold text-surface mb-1">
                Add basic details
              </h1>
              <p className="text-muted text-sm mb-4">
                Event name, your name, and where to receive contributions.
              </p>

              <FloatingLabelInput
                id="title"
                label="Event title"
                value={title}
                onChange={setTitle}
                required
                placeholder="e.g. John & Mary's Wedding"
              />
              <FloatingLabelInput
                id="organizer"
                label="Your name (treasurer)"
                value={organizer}
                onChange={setOrganizer}
                required
                placeholder="e.g. Sarah Nakato"
              />
              <FloatingLabelInput
                id="treasurerPhone"
                label="Mobile Money number"
                value={treasurerPhone}
                onChange={setTreasurerPhone}
                type="tel"
                required
                placeholder="e.g. 0772 123 456"
                hint="Contributions go directly here. We never hold funds."
              />
              <div className="grid grid-cols-2 gap-4">
                <FloatingLabelInput
                  id="date"
                  label="Event date"
                  value={date}
                  onChange={setDate}
                  type="date"
                  required
                />
                <FloatingLabelInput
                  id="location"
                  label="Location"
                  value={location}
                  onChange={setLocation}
                  required
                  placeholder="e.g. Kampala"
                />
              </div>
              <FloatingLabelInput
                id="targetAmount"
                label="Target amount (UGX, optional)"
                value={targetAmount}
                onChange={setTargetAmount}
                type="number"
                inputMode="numeric"
                placeholder="e.g. 15000000"
                min={0}
              />

              {!showDescription ? (
                <button
                  type="button"
                  onClick={() => setShowDescription(true)}
                  className="text-sm text-accent font-medium"
                >
                  Add description (optional)
                </button>
              ) : (
                <div>
                  <label htmlFor="description" className="sr-only">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => setShowDescription(description.length > 0)}
                    placeholder="Tell people about this event..."
                    rows={2}
                    className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-none bg-light"
                    autoFocus
                  />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 3 && (
        <form onSubmit={handleActivate} className={GRID}>
          {/* Collapsed Step 1 + 2 summaries */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
            >
              <span className="flex items-center gap-3">
                <EventTypeIcon type={type ?? "wedding"} className="w-5 h-5 text-accent" />
                <span className="font-medium text-surface">{typeLabel}</span>
              </span>
              <span className="text-sm text-accent">Change</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-muted/20 text-left"
            >
              <div className="text-left min-w-0">
                <p className="font-medium text-surface truncate">{title || "Event"}</p>
                <p className="text-muted text-sm">
                  {date
                    ? new Date(date).toLocaleDateString("en-UG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}{" "}
                  · {location || "—"}
                </p>
              </div>
              <span className="text-sm text-accent flex-shrink-0 ml-2">Change</span>
            </button>
          </div>

          <div className="bg-light rounded-xl border border-muted/30 overflow-hidden">
            <div className="p-6">
              <h1 className="text-xl font-bold text-surface mb-1">
                Confirm & activate
              </h1>
              <p className="text-muted text-sm mb-6">
                One-time subscription. Then share your event and receive contributions.
              </p>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/10 border border-muted/20 mb-4">
                <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center text-accent flex-shrink-0">
                  <IconWallet className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-surface">
                    UGX {SUBSCRIPTION_FEE.toLocaleString()}
                  </p>
                  <p className="text-muted text-sm">
                    CeremonyWallet subscription · Pay via Mobile Money
                  </p>
                </div>
              </div>

              {momoWait && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-surface mb-1">Approve on your phone</p>
                  <p className="text-muted text-sm mb-4">
                    We sent a Mobile Money request for UGX {SUBSCRIPTION_FEE.toLocaleString()}. Open the prompt on your phone and enter your PIN to pay.
                  </p>
                  <div className="flex items-center gap-3 py-4 justify-center">
                    <span className="inline-block h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" aria-hidden />
                    <span className="text-sm text-muted">Waiting for MTN MoMo…</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMomoWait(false); setMomoRef(null); }}
                    className="text-sm text-accent font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!momoWait && !subscriptionPaid && (
                <>
                  {momoConfigured && (
                    <div className="mb-4">
                      <label className="block text-xs text-muted mb-1" htmlFor="sub-phone">
                        MTN MoMo number (paying wallet)
                      </label>
                      <input
                        id="sub-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        value={subPhone}
                        onChange={(e) => setSubPhone(e.target.value)}
                        placeholder={treasurerPhone || "e.g. 077xxxxxxx"}
                        className="w-full border border-muted/50 rounded-lg px-4 py-3 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
                      />
                      <p className="text-xs text-muted mt-1">
                        Leave blank to use your Mobile Money number above.
                      </p>
                    </div>
                  )}

                  {momoError && (
                    <p className="text-sm text-red-600 mb-3" role="alert">
                      {momoError}
                    </p>
                  )}

                  {momoConfigured ? (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void startSubMomoPay()}
                      className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 text-white font-bold py-4 rounded-lg transition-colors mb-2"
                    >
                      {loading ? "Starting…" : `Pay UGX ${SUBSCRIPTION_FEE.toLocaleString()} with MTN MoMo`}
                    </button>
                  ) : (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subscriptionPaid}
                        onChange={(e) => setSubscriptionPaid(e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-muted text-accent focus:ring-accent"
                      />
                      <span className="text-sm text-muted">
                        I have paid UGX {SUBSCRIPTION_FEE.toLocaleString()} to CeremonyWallet
                      </span>
                    </label>
                  )}
                </>
              )}

              {subscriptionPaid && !momoWait && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 mb-2">
                  <span className="text-green-600 text-lg">&#10003;</span>
                  <span className="text-sm font-medium text-green-800">
                    {momoConfigured ? "Payment received via MTN MoMo" : "Payment confirmed"}
                  </span>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-muted/20">
              <button
                type="submit"
                disabled={loading || !subscriptionPaid}
                className="w-full bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:pointer-events-none text-white font-bold py-4 rounded-lg transition-colors"
              >
                {loading ? "Activating…" : <><span className="sm:hidden">Activate</span><span className="hidden sm:inline">Activate my event</span></>}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
