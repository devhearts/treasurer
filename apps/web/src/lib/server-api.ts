import "server-only";
import { headers } from "next/headers";

/** Thrown when `serverApiJson` / `serverApiJsonInternal` receive a non-2xx response. */
export class ServerApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "ServerApiError";
    this.status = status;
    this.body = body;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function internalBase(): string {
  return (
    process.env.API_INTERNAL_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:4000"
  );
}

function proxySecret(): string {
  return process.env.INTERNAL_PROXY_SECRET ?? "";
}

/** Headers to call the Nest API from Next RSC / route handlers (trusted server). */
export async function serverApiHeaders(): Promise<Headers> {
  const h = new Headers();
  const cookie = (await headers()).get("cookie") ?? "";
  const m = /(?:^|; )cerw_session=([^;]+)/.exec(cookie);
  if (m?.[1]) {
    h.set("x-session-id", decodeURIComponent(m[1]));
  }
  h.set("x-internal-proxy-secret", proxySecret());
  return h;
}

export async function serverApiFetch(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const hdr = await serverApiHeaders();
  if (init?.headers) {
    const extra = new Headers(init.headers as HeadersInit);
    extra.forEach((v, k) => hdr.set(k, v));
  }
  if (
    init?.body &&
    typeof init.body === "string" &&
    !hdr.has("Content-Type")
  ) {
    hdr.set("Content-Type", "application/json");
  }
  return fetch(`${internalBase()}/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: hdr,
  });
}

export async function serverApiJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await serverApiFetch(path, init);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : text || res.statusText;
    throw new ServerApiError(msg, res.status, data);
  }
  return data as T;
}

export async function serverApiFetchInternal(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const h = new Headers(init?.headers);
  h.set("x-internal-proxy-secret", proxySecret());
  if (
    init?.body &&
    typeof init.body === "string" &&
    !h.has("Content-Type")
  ) {
    h.set("Content-Type", "application/json");
  }
  return fetch(`${internalBase()}/${path.replace(/^\//, "")}`, {
    ...init,
    cache: "no-store",
    headers: h,
  });
}

export async function serverApiJsonInternal<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await serverApiFetchInternal(path, init);
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const msg =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : text || res.statusText;
    throw new ServerApiError(msg, res.status, data);
  }
  return data as T;
}
