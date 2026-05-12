import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_INTERNAL =
  process.env.API_INTERNAL_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:4000";
const PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET ?? "";

async function proxy(req: NextRequest, pathSegments: string[] | undefined) {
  const subpath = pathSegments?.length ? pathSegments.join("/") : "";
  const url = new URL(req.url);
  const targetUrl = `${API_INTERNAL}/${subpath}${url.search}`;

  const headers = new Headers();
  const ct = req.headers.get("content-type");
  if (ct) headers.set("content-type", ct);
  headers.set("x-forwarded-host", req.headers.get("host") ?? "");
  headers.set("x-forwarded-for", req.headers.get("x-forwarded-for") ?? "");

  const session = req.cookies.get("cerw_session")?.value;
  if (session) headers.set("x-session-id", session);
  if (PROXY_SECRET) headers.set("x-internal-proxy-secret", PROXY_SECRET);

  const method = req.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method,
    headers,
    body:
      body && body.byteLength > 0
        ? Buffer.from(body)
        : undefined,
  });

  const resHeaders = new Headers(upstream.headers);
  const setSession = upstream.headers.get("x-set-session");
  resHeaders.delete("x-set-session");

  const out = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });

  if (setSession?.trim()) {
    out.cookies.set("cerw_session", setSession.trim(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (subpath === "auth/logout" && upstream.ok) {
    out.cookies.delete("cerw_session");
  }

  if (upstream.status === 401) {
    out.cookies.delete("cerw_session");
  }

  return out;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
