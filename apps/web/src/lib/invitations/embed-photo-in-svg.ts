import "server-only";

import { serverApiFetchInternal } from "@/lib/server-api";

function mimeToDataUrl(mime: string, base64: string): string {
  return `data:${mime};base64,${base64}`;
}

/**
 * Fetches a same-origin photo URL and inlines it as base64 so sharp can rasterize the SVG.
 */
export async function embedPhotoInSvg(
  svg: string,
  photoHref: string
): Promise<string> {
  const pathname = photoHref.startsWith("http")
    ? new URL(photoHref).pathname
    : photoHref;
  const apiPath = pathname.replace(/^\/?api\/v1\//, "");
  const res = await serverApiFetchInternal(apiPath);
  if (!res.ok) return svg;

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) return svg;

  const mime = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const dataUrl = mimeToDataUrl(mime, buf.toString("base64"));
  const safe = dataUrl.replace(/"/g, "'");

  if (svg.includes('id="invitePhoto"')) {
    return svg.replace(/href="[^"]*"/, `href="${safe}"`);
  }

  const imageTag = `<image id="invitePhoto" href="${safe}" xlink:href="${safe}" preserveAspectRatio="xMidYMid slice"/>`;
  return svg.replace("</svg>", `${imageTag}</svg>`);
}
