export type PaymentProcessorKind = "pawapay" | "momo";

const LOG_BODY_MAX = 16_000;

export class PaymentProcessorHttpError extends Error {
  readonly provider: PaymentProcessorKind;
  readonly operation: string;
  readonly httpStatus: number;
  readonly rawBody: string;
  readonly parsedBody?: unknown;
  readonly failureCode?: string;
  readonly payoutId?: string;

  constructor(
    message: string,
    opts: {
      provider: PaymentProcessorKind;
      operation: string;
      httpStatus: number;
      rawBody: string;
      parsedBody?: unknown;
      failureCode?: string;
      payoutId?: string;
    }
  ) {
    super(message);
    this.name = "PaymentProcessorHttpError";
    this.provider = opts.provider;
    this.operation = opts.operation;
    this.httpStatus = opts.httpStatus;
    this.rawBody = opts.rawBody;
    this.parsedBody = opts.parsedBody;
    this.failureCode = opts.failureCode;
    this.payoutId = opts.payoutId;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Full provider response for logs (not for end-user messages). */
  logDetail(): string {
    const rawBody =
      this.rawBody.length > LOG_BODY_MAX
        ? `${this.rawBody.slice(0, LOG_BODY_MAX)}…[truncated ${this.rawBody.length - LOG_BODY_MAX} chars]`
        : this.rawBody;
    return JSON.stringify({
      provider: this.provider,
      operation: this.operation,
      httpStatus: this.httpStatus,
      message: this.message,
      failureCode: this.failureCode,
      rawBody,
      parsedBody: this.parsedBody,
    });
  }
}

export function tryParseJsonBody(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

/** Use in catch blocks when logging payment processor / disbursement failures. */
export function formatProcessorExceptionForLog(e: unknown): string {
  if (e instanceof PaymentProcessorHttpError) return e.logDetail();
  if (e instanceof Error) {
    const extra = e as Error & { rawBody?: string };
    if (typeof extra.rawBody === "string" && extra.rawBody) {
      return JSON.stringify({
        name: e.name,
        message: e.message,
        rawBody:
          extra.rawBody.length > LOG_BODY_MAX
            ? `${extra.rawBody.slice(0, LOG_BODY_MAX)}…`
            : extra.rawBody,
      });
    }
    return e.stack ?? e.message;
  }
  return String(e);
}

export function pawapayFailureReason(
  parsed: unknown
): { failureCode?: string; failureMessage?: string } | undefined {
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const reason = (parsed as Record<string, unknown>).failureReason;
  if (typeof reason !== "object" || reason === null) return undefined;
  const r = reason as Record<string, unknown>;
  return {
    failureCode:
      typeof r.failureCode === "string" ? r.failureCode : undefined,
    failureMessage:
      typeof r.failureMessage === "string" ? r.failureMessage : undefined,
  };
}

export function pawapayFailureCode(parsed: unknown): string | undefined {
  if (typeof parsed === "object" && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    if (typeof o.failureCode === "string" && o.failureCode) return o.failureCode;
    const nested = pawapayFailureReason(parsed);
    if (nested?.failureCode) return nested.failureCode;
  }
  return undefined;
}

export function pawapayErrorMessage(
  parsed: unknown,
  rawBody: string,
  httpStatus: number
): string {
  if (typeof parsed === "object" && parsed !== null) {
    const o = parsed as Record<string, unknown>;
    const nested = pawapayFailureReason(parsed);
    if (nested?.failureMessage) return nested.failureMessage;
    if (typeof o.failureMessage === "string" && o.failureMessage) {
      return o.failureMessage;
    }
    if (typeof o.errorMessage === "string" && o.errorMessage) {
      return o.errorMessage;
    }
    if (nested?.failureCode) return nested.failureCode;
    if (typeof o.failureCode === "string" && o.failureCode) {
      return o.failureCode;
    }
  }
  const trimmed = rawBody.trim();
  return trimmed.slice(0, 500) || `HTTP ${httpStatus}`;
}

/** Short message safe for DB / API responses (not full provider JSON). */
export function processorUserMessage(e: unknown, fallback = "Payment failed"): string {
  if (e instanceof PaymentProcessorHttpError) {
    const msg = e.message.trim();
    if (msg && !msg.startsWith("{")) return msg;
    if (e.parsedBody) {
      const parsed = pawapayErrorMessage(e.parsedBody, e.rawBody, e.httpStatus);
      if (parsed && !parsed.startsWith("{")) return parsed;
    }
    return fallback;
  }
  if (e instanceof Error) {
    const msg = e.message.trim();
    return msg && !msg.startsWith("{") ? msg : fallback;
  }
  return fallback;
}
