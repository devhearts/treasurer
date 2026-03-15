"use client";

import { useState, useEffect } from "react";
import { CeremonyEvent } from "@/lib/types";

/* ─── font injection ─────────────────────────────────────── */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-UG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function buildInviteText(
  guestName: string,
  event: CeremonyEvent,
  customMessage: string
): string {
  const dateStr = formatDate(event.date);
  const lines = [
    `You're Invited!`,
    ``,
    `Dear ${guestName},`,
    ``,
    `We joyfully invite you to celebrate with us at:`,
    ``,
    `${event.title}`,
    `${dateStr}`,
    `${event.location}`,
    ``,
  ];
  if (customMessage.trim()) {
    lines.push(customMessage.trim());
    lines.push(``);
  }
  lines.push(`Your support means the world to us.`);
  lines.push(``);
  lines.push(`With love,`);
  lines.push(`${event.organizer}`);
  lines.push(``);
  lines.push(`CeremonyWallet`);
  return lines.join("\n");
}

/* ─── ornament SVG ───────────────────────────────────────── */
function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <line x1="0" y1="12" x2="72" y2="12" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M88 12 C92 4, 96 4, 100 12 C104 20, 108 20, 112 12"
        stroke="currentColor"
        strokeWidth="0.75"
        fill="none"
      />
      <circle cx="100" cy="12" r="2.5" fill="currentColor" />
      <circle cx="84" cy="12" r="1.5" fill="currentColor" />
      <circle cx="116" cy="12" r="1.5" fill="currentColor" />
      <line x1="128" y1="12" x2="200" y2="12" stroke="currentColor" strokeWidth="0.75" />
    </svg>
  );
}

/* ─── invitation card preview ────────────────────────────── */
function InvitationCard({
  text,
  visible,
}: {
  text: string;
  visible: boolean;
}) {
  const lines = text.split("\n");
  const title = lines[0] ?? "";
  const dear = lines[2] ?? "";
  const body = lines.slice(4, -4).join("\n").trim();
  const closing = lines.slice(-4).join("\n");

  return (
    <div
      style={{
        transition: "opacity 0.5s ease, transform 0.5s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        pointerEvents: visible ? "auto" : "none",
        height: visible ? "auto" : 0,
        overflow: visible ? "visible" : "hidden",
      }}
    >
      <div
        style={{
          background: "linear-gradient(160deg, #fdf8f1 0%, #fef9f2 60%, #fdf4e7 100%)",
          border: "1px solid #d4b896",
          borderRadius: "2px",
          padding: "40px 36px",
          position: "relative",
          boxShadow:
            "0 2px 6px rgba(180,140,100,0.08), 0 12px 40px rgba(160,120,80,0.1)",
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          color: "#3d2b1f",
          textAlign: "center",
          marginBottom: "16px",
        }}
      >
        {/* corner ornaments */}
        {["top-2 left-2", "top-2 right-2 rotate-90", "bottom-2 right-2 rotate-180", "bottom-2 left-2 -rotate-90"].map(
          (pos, i) => (
            <svg
              key={i}
              viewBox="0 0 20 20"
              width="18"
              height="18"
              className={`absolute ${pos}`}
              style={{ color: "#c9a96e" }}
              fill="none"
            >
              <path d="M2 2 Q2 10 10 10 Q2 10 2 18" stroke="currentColor" strokeWidth="0.8" />
              <circle cx="2" cy="2" r="1.2" fill="currentColor" />
            </svg>
          )
        )}

        {/* inner border */}
        <div
          style={{
            border: "1px solid rgba(196,160,100,0.35)",
            borderRadius: "1px",
            padding: "28px 24px",
          }}
        >
          <p
            style={{
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "11px",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#b8956a",
              marginBottom: "14px",
            }}
          >
            {title}
          </p>

          <Ornament className="mx-auto mb-5" style={{ color: "#c9a96e", width: "140px" }} />

          <p
            style={{
              fontSize: "15px",
              fontWeight: 300,
              color: "#5a3e2b",
              marginBottom: "18px",
              lineHeight: 1.6,
            }}
          >
            {dear}
          </p>

          <div
            style={{
              fontSize: "13.5px",
              lineHeight: 1.85,
              color: "#4a3525",
              fontWeight: 300,
              whiteSpace: "pre-line",
              marginBottom: "20px",
            }}
          >
            {body}
          </div>

          <Ornament className="mx-auto mt-3 mb-5" style={{ color: "#c9a96e", width: "100px" }} />

          <p
            style={{
              fontStyle: "italic",
              fontSize: "14px",
              color: "#7a5c3e",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {closing}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────── */
export default function InviteCardGenerator({ event }: { event: CeremonyEvent }) {
  const [customMessage, setCustomMessage] = useState(
    "Thank you for your generous contribution to our special day."
  );
  const [customName, setCustomName] = useState("");
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [previewFor, setPreviewFor] = useState<string | null>(null);

  /* inject Google Fonts */
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  const namedContributors = event.contributions.filter((c) => !c.anonymous);

  async function handleCopy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopiedFor(id);
    setTimeout(() => setCopiedFor(null), 2500);
  }

  function handleShare(text: string) {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ title: "Wedding invitation", text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  }

  const customInviteText =
    customName.trim()
      ? buildInviteText(customName.trim(), event, customMessage)
      : "";

  /* ── styles ── */
  const base: React.CSSProperties = {
    fontFamily: "'Jost', sans-serif",
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontStyle: "italic",
    fontSize: "11px",
    letterSpacing: "0.2em",
    textTransform: "uppercase" as const,
    color: "#b8956a",
    marginBottom: "10px",
    display: "block",
  };

  const card: React.CSSProperties = {
    background: "linear-gradient(135deg, #fefaf4 0%, #fdf7ee 100%)",
    border: "1px solid rgba(196,160,100,0.3)",
    borderRadius: "4px",
    padding: "20px",
    boxShadow: "0 1px 4px rgba(160,120,80,0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid rgba(196,160,100,0.45)",
    borderRadius: "3px",
    padding: "10px 14px",
    fontSize: "13px",
    fontFamily: "'Jost', sans-serif",
    color: "#3d2b1f",
    background: "rgba(255,252,245,0.9)",
    outline: "none",
    boxSizing: "border-box" as const,
    letterSpacing: "0.02em",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    resize: "none" as const,
    lineHeight: 1.6,
  };

  const btnPrimary: React.CSSProperties = {
    width: "100%",
    padding: "11px 20px",
    borderRadius: "3px",
    background: "linear-gradient(135deg, #c9a96e 0%, #b8885a 100%)",
    color: "#fff",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 500,
    fontSize: "12px",
    letterSpacing: "0.16em",
    textTransform: "uppercase" as const,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 2px 12px rgba(180,130,70,0.28)",
    transition: "opacity 0.2s",
  };

  const btnSecondary: React.CSSProperties = {
    width: "100%",
    padding: "10px 20px",
    borderRadius: "3px",
    background: "transparent",
    color: "#b8956a",
    fontFamily: "'Jost', sans-serif",
    fontWeight: 400,
    fontSize: "12px",
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    border: "1px solid rgba(196,160,100,0.45)",
    cursor: "pointer",
    marginTop: "8px",
    transition: "background 0.2s",
  };

  const btnGhost: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: "3px",
    background: "transparent",
    border: "1px solid rgba(196,160,100,0.4)",
    color: "#a07848",
    fontFamily: "'Jost', sans-serif",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const btnGhostActive: React.CSSProperties = {
    ...btnGhost,
    background: "#c9a96e",
    color: "#fff",
    border: "1px solid #c9a96e",
  };

  const btnShareInline: React.CSSProperties = {
    ...btnGhost,
    color: "#b8956a",
  };

  return (
    <div style={{ ...base, display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* ── personalised message accordion ── */}
      <div style={card}>
        <span style={sectionLabel}>Message for all invitations</span>
        <textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          rows={2}
          style={textareaStyle}
          placeholder="A personal note added to every invitation…"
        />
      </div>

      {/* ── contributors list ── */}
      {namedContributors.length > 0 && (
        <div>
          <span style={{ ...sectionLabel, marginBottom: "12px" }}>
            Contributors
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {namedContributors.map((contributor) => {
              const text = buildInviteText(contributor.name, event, customMessage);
              const isCopied = copiedFor === contributor.id;
              const isPreview = previewFor === contributor.id;

              return (
                <div key={contributor.id}>
                  <div
                    style={{
                      ...card,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      padding: "14px 18px",
                    }}
                  >
                    {/* name + preview toggle */}
                    <button
                      onClick={() =>
                        setPreviewFor(isPreview ? null : contributor.id)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        textAlign: "left",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Cormorant Garamond', Georgia, serif",
                          fontSize: "15px",
                          fontWeight: 400,
                          color: "#3d2b1f",
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {contributor.name}
                      </span>
                      <span
                        style={{
                          fontSize: "10px",
                          letterSpacing: "0.12em",
                          color: "#b8956a",
                          fontFamily: "'Jost', sans-serif",
                        }}
                      >
                        {isPreview ? "Hide preview" : "Preview card"}
                      </span>
                    </button>

                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button
                        onClick={() => handleCopy(contributor.id, text)}
                        style={isCopied ? btnGhostActive : btnGhost}
                      >
                        {isCopied ? "Copied ✓" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleShare(text)}
                        style={btnShareInline}
                      >
                        Share
                      </button>
                    </div>
                  </div>

                  {/* inline card preview */}
                  <div
                    style={{
                      overflow: "hidden",
                      maxHeight: isPreview ? "600px" : "0",
                      transition: "max-height 0.45s ease",
                      marginTop: isPreview ? "10px" : "0",
                    }}
                  >
                    <InvitationCard text={text} visible={isPreview} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── custom invitation ── */}
      <div style={card}>
        <span style={sectionLabel}>Custom invitation</span>

        <div style={{ position: "relative" }}>
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Enter guest name…"
            style={{ ...inputStyle, marginBottom: "14px" }}
          />
          {/* subtle leaf icon inside input */}
          <span
            style={{
              position: "absolute",
              right: "12px",
              top: "10px",
              color: "#c9a96e",
              fontSize: "14px",
              pointerEvents: "none",
            }}
          >
            ✦
          </span>
        </div>

        {customInviteText && (
          <>
            {/* preview */}
            <InvitationCard text={customInviteText} visible={true} />

            <button
              onClick={() => handleCopy("custom", customInviteText)}
              style={{
                ...btnPrimary,
                opacity: copiedFor === "custom" ? 0.85 : 1,
              }}
            >
              {copiedFor === "custom" ? "Copied to clipboard ✓" : "Copy invitation"}
            </button>

            <button
              type="button"
              onClick={() => handleShare(customInviteText)}
              style={btnSecondary}
            >
              Share via WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  );
}
