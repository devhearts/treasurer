"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StepIndicator from "@/components/wallet/StepIndicator";
import OtpInput from "@/components/wallet/OtpInput";
import PayoutMethodForm from "@/components/wallet/PayoutMethodForm";
import { formatUGX } from "@/lib/data";
import { formatFeeRatePercent } from "@/lib/wallet/fee-labels";
import { payoutMethodPayloadFromForm } from "@/lib/wallet/payout-method-validation";
import type {
  PayoutMethod,
  WithdrawFeeQuote,
  WithdrawInitiateResult,
  WithdrawPollResult,
} from "@/lib/wallet/types";
import {
  deletePayoutMethod,
  initiatePayoutMethodAdd,
  resendPayoutMethodAddOtp,
  updatePayoutMethod,
  verifyPayoutMethodAdd,
  initiateWithdraw,
  pollWithdraw,
  quoteWithdraw,
  resendWithdrawOtp,
  verifyWithdrawOtp,
} from "@/app/actions/wallet";
import type { PayoutMethodAddInitiate } from "@/lib/wallet/types";
import { withdrawDebug } from "@/lib/wallet/withdraw-debug";
import { IconBack } from "@/components/Icons";

const MOMO_POLL_MS = 2500;
const MOMO_MAX_POLLS = 48;
const DEFAULT_WITHDRAW_AMOUNT = 100_000;

function defaultWithdrawAmount(balance: number): string {
  return String(Math.min(DEFAULT_WITHDRAW_AMOUNT, Math.max(0, balance)));
}

interface WithdrawWizardProps {
  initialBalance: number;
  initialMethods: PayoutMethod[];
  userEmail: string;
  /** Verified accounts use a single auto-provisioned method; no add/edit/delete. */
  methodsReadOnly?: boolean;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

type MethodFormMode = null | "add" | { editId: string };

function isEditFormMode(mode: MethodFormMode): mode is { editId: string } {
  return mode !== null && mode !== "add";
}

export default function WithdrawWizard({
  initialBalance,
  initialMethods,
  userEmail,
  methodsReadOnly = false,
}: WithdrawWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [methods, setMethods] = useState(initialMethods);
  const [selectedMethodId, setSelectedMethodId] = useState(
    initialMethods.find((m) => m.isDefault)?.id ?? initialMethods[0]?.id ?? ""
  );
  const [methodFormMode, setMethodFormMode] = useState<MethodFormMode>(null);
  const [addMethodPending, setAddMethodPending] =
    useState<PayoutMethodAddInitiate | null>(null);
  const [addMethodOtp, setAddMethodOtp] = useState("");
  const [addResendSec, setAddResendSec] = useState(0);
  const [methodFormError, setMethodFormError] = useState<string | null>(null);
  const [methodFormLoading, setMethodFormLoading] = useState(false);
  const [amount, setAmount] = useState(() =>
    defaultWithdrawAmount(initialBalance)
  );
  const [fees, setFees] = useState<WithdrawFeeQuote | null>(null);
  const [initResult, setInitResult] = useState<WithdrawInitiateResult | null>(
    null
  );
  const [otp, setOtp] = useState("");
  const [resendSec, setResendSec] = useState(45);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollResult, setPollResult] = useState<WithdrawPollResult | null>(null);

  const selectedMethod = methods.find((m) => m.id === selectedMethodId);

  const refreshFees = useCallback(async (gross: number) => {
    const q = await quoteWithdraw(gross);
    if (q.ok) setFees(q.data);
    else setFees(null);
  }, []);

  useEffect(() => {
    const n = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (n >= 5000) refreshFees(n);
  }, [amount, refreshFees]);

  useEffect(() => {
    if (step !== 3 || resendSec <= 0) return;
    const t = setInterval(() => setResendSec((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, resendSec]);

  useEffect(() => {
    if (!addMethodPending || addResendSec <= 0) return;
    const t = setInterval(
      () => setAddResendSec((s) => Math.max(0, s - 1)),
      1000
    );
    return () => clearInterval(t);
  }, [addMethodPending, addResendSec]);

  const editingMethod = isEditFormMode(methodFormMode)
    ? methods.find((m) => m.id === methodFormMode.editId)
    : undefined;

  async function handleSaveMethod(
    payload: ReturnType<typeof payoutMethodPayloadFromForm>
  ) {
    setMethodFormLoading(true);
    setMethodFormError(null);
    setError(null);
    try {
      if (methodFormMode === "add") {
        const pending = await initiatePayoutMethodAdd(payload);
        if (!pending.ok) {
          setMethodFormError(pending.error);
          return;
        }
        setAddMethodPending(pending.data);
        setAddMethodOtp("");
        setAddResendSec(pending.data.resendAvailableInSec);
      } else if (isEditFormMode(methodFormMode)) {
        const m = await updatePayoutMethod(methodFormMode.editId, payload);
        if (!m.ok) {
          setMethodFormError(m.error);
          return;
        }
        setMethods((prev) =>
          prev.map((x) => (x.id === m.data.id ? m.data : x))
        );
        setSelectedMethodId(m.data.id);
        setMethodFormMode(null);
      }
    } catch (e) {
      setMethodFormError(
        e instanceof Error ? e.message : "Could not save method."
      );
    } finally {
      setMethodFormLoading(false);
    }
  }

  function cancelAddMethod() {
    setMethodFormMode(null);
    setAddMethodPending(null);
    setAddMethodOtp("");
    setMethodFormError(null);
  }

  async function handleResendAddOtp() {
    if (!addMethodPending || addResendSec > 0) return;
    setMethodFormLoading(true);
    setMethodFormError(null);
    try {
      const r = await resendPayoutMethodAddOtp(addMethodPending.pendingId);
      if (!r.ok) {
        setMethodFormError(r.error);
        return;
      }
      setAddResendSec(r.data.resendAvailableInSec);
    } catch (e) {
      setMethodFormError(
        e instanceof Error ? e.message : "Could not resend code."
      );
    } finally {
      setMethodFormLoading(false);
    }
  }

  async function handleVerifyAddOtp() {
    if (!addMethodPending || addMethodOtp.length !== 6) return;
    setMethodFormLoading(true);
    setMethodFormError(null);
    try {
      const m = await verifyPayoutMethodAdd(
        addMethodPending.pendingId,
        addMethodOtp
      );
      if (!m.ok) {
        setMethodFormError(m.error);
        return;
      }
      setMethods((prev) => [...prev, m.data]);
      setSelectedMethodId(m.data.id);
      cancelAddMethod();
    } catch (e) {
      setMethodFormError(
        e instanceof Error ? e.message : "Invalid or expired code."
      );
    } finally {
      setMethodFormLoading(false);
    }
  }

  async function handleDeleteMethod(m: PayoutMethod) {
    const ok = window.confirm(
      `Remove ${m.label} (${m.detailLine})? This cannot be undone.`
    );
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      const del = await deletePayoutMethod(m.id);
      if (!del.ok) {
        setError(del.error);
        return;
      }
      const next = methods.filter((x) => x.id !== m.id);
      setMethods(next);
      if (selectedMethodId === m.id) {
        setSelectedMethodId(
          next.find((x) => x.isDefault)?.id ?? next[0]?.id ?? ""
        );
      }
      if (isEditFormMode(methodFormMode) && methodFormMode.editId === m.id) {
        setMethodFormMode(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete method.");
    } finally {
      setLoading(false);
    }
  }

  async function goToStep2() {
    if (!selectedMethodId) {
      setError("Select a withdraw method.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function goToStep3() {
    const gross = parseInt(amount.replace(/\D/g, ""), 10) || 0;
    if (gross < 5000) {
      setError("Minimum withdrawal is UGX 5,000.");
      return;
    }
    if (gross > initialBalance) {
      setError("Amount exceeds available balance.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await initiateWithdraw({
        methodId: selectedMethodId,
        grossAmount: gross,
        idempotencyKey: crypto.randomUUID(),
      });
      if (!result.ok) {
        withdrawDebug("goToStep3:initiate:error", { error: result.error });
        setError(result.error);
        return;
      }
      withdrawDebug("goToStep3:initiate:ok", {
        withdrawalId: result.data.withdrawalId,
        reference: result.data.reference,
      });
      setInitResult(result.data);
      setResendSec(result.data.resendAvailableInSec);
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!initResult || resendSec > 0) return;
    setLoading(true);
    setError(null);
    try {
      const r = await resendWithdrawOtp(initResult.withdrawalId);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setResendSec(r.data.resendAvailableInSec);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resend code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (!initResult || otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      withdrawDebug("handleVerifyOtp:start", {
        withdrawalId: initResult.withdrawalId,
      });
      const verified = await verifyWithdrawOtp(initResult.withdrawalId, otp);
      if (!verified.ok) {
        withdrawDebug("handleVerifyOtp:error", { error: verified.error });
        setError(verified.error);
        return;
      }
      let result = verified.data;
      withdrawDebug("handleVerifyOtp:initial", { status: result.status });
      if (result.status === "PENDING") {
        for (let i = 0; i < MOMO_MAX_POLLS; i++) {
          await new Promise((r) => setTimeout(r, MOMO_POLL_MS));
          const polled = await pollWithdraw(initResult.withdrawalId);
          if (!polled.ok) {
            withdrawDebug("handleVerifyOtp:poll:error", {
              attempt: i + 1,
              error: polled.error,
            });
            setError(polled.error);
            return;
          }
          result = polled.data;
          withdrawDebug("handleVerifyOtp:poll", {
            attempt: i + 1,
            status: result.status,
          });
          if (result.status !== "PENDING") break;
        }
      }
      withdrawDebug("handleVerifyOtp:done", { status: result.status });
      setPollResult(result);
      setStep(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  const gross = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const navTitle =
    step === 3 ? "Confirm withdrawal" : step === 4 ? "Withdrawal" : "Withdraw";

  return (
    <>
      <div className="bg-surface border-b border-muted/30 sticky top-14 z-40">
        <div className="max-w-lg mx-auto px-4 h-12 flex items-center gap-3">
          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 1) router.push("/app/account");
                else setStep((s) => s - 1);
              }}
              className="inline-flex items-center gap-1 text-accent text-sm hover:underline"
            >
              <IconBack className="w-4 h-4" />
              Back
            </button>
          ) : (
            <span className="w-12" />
          )}
          <h1 className="flex-1 text-center text-light font-medium text-[15px]">
            {navTitle}
          </h1>
          <span className="w-12" />
        </div>
        {step <= 4 && step >= 1 && step < 4 && (
          <StepIndicator total={4} current={step} />
        )}
        {step === 4 && <StepIndicator total={4} current={4} />}
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        {step === 1 && (
          <>
            <h2 className="text-[15px] font-medium text-surface">
              Select withdraw method
            </h2>
            <p className="text-sm text-muted mb-5">
              Choose where to receive your funds
            </p>
            <div className="flex flex-col gap-2.5">
              {methods.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-stretch gap-1 rounded-xl border-[1.5px] overflow-hidden ${
                    selectedMethodId === m.id
                      ? "border-accent bg-lime/10"
                      : "border-muted/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedMethodId(m.id)}
                    className="flex-1 flex items-center gap-3.5 p-4 text-left min-w-0 hover:bg-lime/5 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        m.type === "bank"
                          ? "bg-blue-100 text-blue-800"
                          : m.type === "airtel_momo"
                            ? "bg-orange-100 text-orange-900"
                            : "bg-yellow-100 text-yellow-900"
                      }`}
                    >
                      {m.type === "bank" ? (
                        <span className="text-lg">🏦</span>
                      ) : (
                        <span className="text-lg">📱</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface">{m.label}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {m.detailLine}
                      </p>
                    </div>
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 ${
                        selectedMethodId === m.id
                          ? "border-accent bg-accent"
                          : "border-muted/40"
                      }`}
                    >
                      {selectedMethodId === m.id && (
                        <div className="w-2 h-2 bg-white rounded-full m-auto mt-[3px]" />
                      )}
                    </div>
                  </button>
                  {!methodsReadOnly && (
                    <div className="flex flex-col border-l border-muted/20">
                      <button
                        type="button"
                        title="Edit"
                        disabled={!!methodFormMode || loading}
                        onClick={() => {
                          setMethodFormError(null);
                          setMethodFormMode({ editId: m.id });
                        }}
                        className="flex-1 px-3 text-xs text-muted hover:text-accent hover:bg-cream/80 disabled:opacity-40"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        disabled={!!methodFormMode || loading}
                        onClick={() => handleDeleteMethod(m)}
                        className="flex-1 px-3 text-xs text-muted hover:text-red-700 hover:bg-red-50 disabled:opacity-40 border-t border-muted/20"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {!methodsReadOnly && !methodFormMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setMethodFormError(null);
                    setAddMethodPending(null);
                    setAddMethodOtp("");
                    setMethodFormMode("add");
                  }}
                  disabled={loading}
                  className="w-full flex items-center gap-3.5 p-4 rounded-xl border-[1.5px] border-dashed border-muted/40 text-muted text-sm hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                >
                  <span className="text-xl">+</span>
                  Add new method
                </button>
              ) : !methodsReadOnly && addMethodPending ? (
                <div className="rounded-xl border border-muted/30 p-4 bg-cream/50 space-y-4">
                  <p className="text-sm font-medium text-surface">
                    Confirm new payout method
                  </p>
                  <div className="text-xs text-muted space-y-1">
                    <p>
                      <span className="font-medium text-surface">
                        {addMethodPending.methodLabel}
                      </span>
                    </p>
                    <p>{addMethodPending.destination}</p>
                  </div>
                  <p className="text-sm text-muted">
                    A 6-digit code was sent to{" "}
                    <strong className="text-surface">
                      {addMethodPending.otpEmailMasked || maskEmail(userEmail)}
                    </strong>
                  </p>
                  <OtpInput
                    value={addMethodOtp}
                    onChange={setAddMethodOtp}
                    disabled={methodFormLoading}
                  />
                  {methodFormError ? (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {methodFormError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleResendAddOtp}
                    disabled={addResendSec > 0 || methodFormLoading}
                    className="w-full text-sm text-accent disabled:text-muted"
                  >
                    {addResendSec > 0
                      ? `Resend code in 0:${String(addResendSec).padStart(2, "0")}`
                      : "Resend code"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyAddOtp}
                      disabled={methodFormLoading || addMethodOtp.length !== 6}
                      className="flex-1 bg-accent text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
                    >
                      {methodFormLoading ? "Confirming…" : "Confirm method"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelAddMethod}
                      disabled={methodFormLoading}
                      className="px-4 text-sm text-muted border border-muted/30 rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : !methodsReadOnly ? (
                <PayoutMethodForm
                  mode={methodFormMode === "add" ? "add" : "edit"}
                  initialMethod={editingMethod}
                  onSubmit={handleSaveMethod}
                  onCancel={cancelAddMethod}
                  loading={methodFormLoading}
                  serverError={methodFormError}
                />
              ) : null}
            </div>
            <button
              type="button"
              onClick={goToStep2}
              disabled={!selectedMethodId || methods.length === 0}
              className="w-full mt-7 bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-lg disabled:opacity-50"
            >
              Continue →
            </button>
          </>
        )}

        {step === 2 && selectedMethod && (
          <>
            <h2 className="text-[15px] font-medium text-surface">Enter amount</h2>
            <p className="text-sm text-muted mb-4">
              To {selectedMethod.label} · {selectedMethod.detailLine}
            </p>
            <div className="bg-cream rounded-xl p-5 text-center mb-4">
              <p className="text-sm text-muted mb-1">UGX</p>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value.replace(/[^\d]/g, ""))
                }
                className="w-full text-3xl font-medium text-surface text-center bg-transparent outline-none"
              />
              <p className="text-xs text-muted mt-2">
                Available:{" "}
                <span className="text-accent font-medium">
                  {formatUGX(initialBalance)}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {[50000, 100000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(String(v))}
                  className="text-xs px-3.5 py-1.5 rounded-full border border-muted/30 text-muted hover:border-accent hover:text-accent"
                >
                  {v.toLocaleString("en-UG")}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(String(initialBalance))}
                className="text-xs px-3.5 py-1.5 rounded-full border border-muted/30 text-muted hover:border-accent hover:text-accent"
              >
                All funds
              </button>
            </div>
            {fees && (
              <div className="text-sm text-muted space-y-1.5 border-t border-muted/20 pt-3 mb-5">
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span>{formatUGX(fees.grossAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>MoMo fee</span>
                  <span>{formatUGX(fees.momoFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    Platform fee ({formatFeeRatePercent(fees.platformFeeRate)})
                  </span>
                  <span>{formatUGX(fees.platformFee)}</span>
                </div>
                <div className="flex justify-between font-medium text-surface pt-1">
                  <span>You receive</span>
                  <span>{formatUGX(fees.netAmount)}</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={goToStep3}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-lg disabled:opacity-50"
            >
              {loading ? "Please wait…" : "Continue →"}
            </button>
          </>
        )}

        {step === 3 && initResult && fees && (
          <>
            <div className="bg-cream rounded-xl p-4 mb-5 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted">Method</span>
                <span className="font-medium text-surface">
                  {initResult.method.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Destination</span>
                <span className="font-medium text-surface text-right max-w-[60%] truncate">
                  {initResult.method.detailLine}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Amount</span>
                <span className="font-medium">{formatUGX(initResult.grossAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Fees</span>
                <span className="font-medium">
                  {formatUGX(initResult.momoFee + initResult.platformFee)}
                </span>
              </div>
              <div className="flex justify-between border-t border-muted/20 pt-2 mt-1 font-medium">
                <span>You receive</span>
                <span className="text-[#3b6d11]">
                  {formatUGX(initResult.netAmount)}
                </span>
              </div>
            </div>
            <div className="text-center mb-5">
              <div className="w-[60px] h-[60px] rounded-full bg-lime/40 text-[#3b6d11] flex items-center justify-center mx-auto mb-4 text-2xl">
                ✓
              </div>
              <h2 className="text-lg font-medium text-surface">Enter OTP</h2>
              <p className="text-sm text-muted mt-2">
                A 6-digit code was sent to{" "}
                <strong className="text-surface">
                  {initResult.otpEmailMasked || maskEmail(userEmail)}
                </strong>
              </p>
            </div>
            <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={resendSec > 0 || loading}
              className="w-full text-sm text-accent mt-4 mb-6 disabled:text-muted"
            >
              {resendSec > 0
                ? `Resend code in 0:${String(resendSec).padStart(2, "0")}`
                : "Resend code"}
            </button>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-lg disabled:opacity-50"
            >
              {loading ? "Confirming…" : "Confirm withdrawal"}
            </button>
            <Link
              href="/app/account"
              className="block w-full text-center mt-3 py-3 text-sm text-muted border border-muted/30 rounded-lg"
            >
              Cancel
            </Link>
          </>
        )}

        {step === 4 && pollResult && (
          <>
            {pollResult.status === "SUCCESSFUL" ? (
              <div className="text-center py-6">
                <div className="w-[72px] h-[72px] rounded-full bg-lime/40 text-[#3b6d11] flex items-center justify-center mx-auto text-4xl mb-5">
                  ✓
                </div>
                <h2 className="text-xl font-medium text-surface">
                  Withdrawal successful
                </h2>
                <p className="text-sm text-muted mt-2">
                  Sent to {pollResult.withdrawal.methodLabel} ·{" "}
                  {pollResult.withdrawal.methodDetail}
                </p>
                <p className="text-[28px] font-medium text-[#3b6d11] my-4">
                  {formatUGX(pollResult.withdrawal.netAmount)}
                </p>
                <p className="text-xs text-muted mb-6">
                  Ref: {pollResult.withdrawal.reference}
                </p>
                <div className="bg-cream rounded-xl p-4 text-left text-xs space-y-1 mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted">Gross amount</span>
                    <span>{formatUGX(pollResult.withdrawal.grossAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">MoMo fee</span>
                    <span>{formatUGX(pollResult.withdrawal.momoFee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Platform fee</span>
                    <span>{formatUGX(pollResult.withdrawal.platformFee)}</span>
                  </div>
                  <div className="flex justify-between border-t border-muted/20 pt-2 font-medium text-[#3b6d11]">
                    <span>Net received</span>
                    <span>{formatUGX(pollResult.withdrawal.netAmount)}</span>
                  </div>
                </div>
                <Link
                  href="/app/account"
                  className="block w-full bg-accent text-white font-bold py-4 rounded-lg text-center"
                >
                  Back to account
                </Link>
                <Link
                  href="/app"
                  className="block w-full mt-2 py-3 text-sm text-muted border border-muted/30 rounded-lg text-center"
                >
                  Go to home
                </Link>
              </div>
            ) : pollResult.status === "FAILED" ? (
              <div className="text-center py-6">
                <div className="w-[72px] h-[72px] rounded-full bg-red-100 text-[#a32d2d] flex items-center justify-center mx-auto text-4xl mb-5">
                  ✕
                </div>
                <h2 className="text-xl font-medium text-surface">
                  Withdrawal failed
                </h2>
                <p className="text-sm text-muted mt-2">{pollResult.message}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setPollResult(null);
                    setInitResult(null);
                    setOtp("");
                  }}
                  className="w-full mt-8 bg-accent text-white font-bold py-4 rounded-lg"
                >
                  Try again
                </button>
                <Link
                  href="/app/account"
                  className="block w-full mt-2 py-3 text-sm text-muted border border-muted/30 rounded-lg text-center"
                >
                  Back to account
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-[72px] h-[72px] rounded-full bg-cream border border-muted/30 text-accent flex items-center justify-center mx-auto text-4xl mb-5">
                  …
                </div>
                <h2 className="text-xl font-medium text-surface">
                  Withdrawal in progress
                </h2>
                <p className="text-sm text-muted mt-2 max-w-sm mx-auto">
                  Your payout is still being processed. This can take a few
                  minutes. Check your account for the final status.
                </p>
                {initResult ? (
                  <p className="text-xs text-muted mt-3">
                    Ref: {initResult.reference}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={async () => {
                    if (!initResult) return;
                    setLoading(true);
                    setError(null);
                    try {
                      const polled = await pollWithdraw(
                        initResult.withdrawalId
                      );
                      if (!polled.ok) {
                        setError(polled.error);
                        return;
                      }
                      setPollResult(polled.data);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || !initResult}
                  className="w-full mt-8 bg-accent text-white font-bold py-4 rounded-lg disabled:opacity-50"
                >
                  {loading ? "Checking…" : "Check status"}
                </button>
                <Link
                  href="/app/account"
                  className="block w-full mt-2 py-3 text-sm text-muted border border-muted/30 rounded-lg text-center"
                >
                  Back to account
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
