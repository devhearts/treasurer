/** Redact MSISDN for logs (last 4 digits only). */
export function maskMsisdn(msisdn: string | null | undefined): string {
  if (!msisdn) return "—";
  const digits = msisdn.replace(/\D/g, "");
  return digits.length > 4 ? `***${digits.slice(-4)}` : "***";
}

export function shortId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}
