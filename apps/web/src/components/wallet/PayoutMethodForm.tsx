"use client";

import { useMemo, useState } from "react";
import FloatingLabelInput from "@/components/FloatingLabelInput";
import type { PayoutMethodType } from "@/lib/wallet/types";
import {
  emptyPayoutMethodForm,
  payoutMethodFormFromMethod,
  payoutMethodPayloadFromForm,
  validatePayoutMethodForm,
  type PayoutMethodFormValues,
} from "@/lib/wallet/payout-method-validation";
import type { PayoutMethod } from "@/lib/wallet/types";

interface PayoutMethodFormProps {
  mode: "add" | "edit";
  initialMethod?: PayoutMethod;
  /** When editing, type is fixed. When adding, user can pick type. */
  onSubmit: (payload: ReturnType<typeof payoutMethodPayloadFromForm>) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  serverError?: string | null;
}

export default function PayoutMethodForm({
  mode,
  initialMethod,
  onSubmit,
  onCancel,
  loading = false,
  serverError,
}: PayoutMethodFormProps) {
  const [values, setValues] = useState<PayoutMethodFormValues>(() =>
    initialMethod
      ? payoutMethodFormFromMethod(initialMethod)
      : emptyPayoutMethodForm("mtn_momo")
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const { errors: validationErrors } = useMemo(
    () => validatePayoutMethodForm(values),
    [values]
  );

  const showError = (field: keyof PayoutMethodFormValues) =>
    submitAttempted && validationErrors[field];

  function setField<K extends keyof PayoutMethodFormValues>(
    key: K,
    val: PayoutMethodFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function handleTypeChange(type: PayoutMethodType) {
    if (mode === "edit") return;
    setValues(emptyPayoutMethodForm(type));
    setSubmitAttempted(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    const { valid } = validatePayoutMethodForm(values);
    if (!valid) return;
    await onSubmit(payoutMethodPayloadFromForm(values));
  }

  const typeLabel =
    values.type === "mtn_momo"
      ? "MTN Mobile Money"
      : values.type === "airtel_momo"
        ? "Airtel Money"
        : "Bank account";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-muted/30 p-4 bg-cream/50 space-y-3"
      noValidate
    >
      <p className="text-sm font-medium text-surface">
        {mode === "add" ? "Add payout method" : "Edit payout method"}
      </p>

      {mode === "add" ? (
        <div className="flex gap-2 flex-wrap">
          {(["mtn_momo", "airtel_momo", "bank"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                values.type === t
                  ? "bg-accent text-white border-accent"
                  : "border-muted/30 text-muted"
              }`}
            >
              {t === "mtn_momo"
                ? "MTN MoMo"
                : t === "airtel_momo"
                  ? "Airtel"
                  : "Bank"}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted">
          Type: <span className="font-medium text-surface">{typeLabel}</span>
        </p>
      )}

      <FloatingLabelInput
        id={`${mode}-label`}
        label="Nickname (optional)"
        value={values.label}
        onChange={(v) => setField("label", v)}
        hint="e.g. Personal MoMo"
      />
      {showError("label") ? (
        <FieldError message={validationErrors.label!} />
      ) : null}

      {values.type === "bank" ? (
        <>
          <FloatingLabelInput
            id={`${mode}-bank-name`}
            label="Bank name"
            value={values.bankName}
            onChange={(v) => setField("bankName", v)}
            required
          />
          {showError("bankName") ? (
            <FieldError message={validationErrors.bankName!} />
          ) : null}
          <FloatingLabelInput
            id={`${mode}-account`}
            label="Account number"
            value={values.accountNumber}
            onChange={(v) => setField("accountNumber", v)}
            required
          />
          {showError("accountNumber") ? (
            <FieldError message={validationErrors.accountNumber!} />
          ) : null}
          <FloatingLabelInput
            id={`${mode}-branch`}
            label="Branch (optional)"
            value={values.branch}
            onChange={(v) => setField("branch", v)}
          />
          {showError("branch") ? (
            <FieldError message={validationErrors.branch!} />
          ) : null}
          <FloatingLabelInput
            id={`${mode}-swift`}
            label="SWIFT (optional)"
            value={values.swift}
            onChange={(v) => setField("swift", v)}
          />
          {showError("swift") ? (
            <FieldError message={validationErrors.swift!} />
          ) : null}
        </>
      ) : (
        <>
          <FloatingLabelInput
            id={`${mode}-msisdn`}
            label={
              values.type === "mtn_momo"
                ? "MTN MoMo number"
                : "Airtel Money number"
            }
            type="tel"
            value={values.msisdn}
            onChange={(v) => setField("msisdn", v)}
            hint="e.g. 077 123 4567 or 256771234567"
            required
          />
          {showError("msisdn") ? (
            <FieldError message={validationErrors.msisdn!} />
          ) : null}
        </>
      )}

      {serverError ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {serverError}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-accent text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50"
        >
          {loading
            ? "Please wait…"
            : mode === "add"
              ? "Continue"
              : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 text-sm text-muted border border-muted/30 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message: string }) {
  return <p className="text-xs text-red-700 -mt-2">{message}</p>;
}
