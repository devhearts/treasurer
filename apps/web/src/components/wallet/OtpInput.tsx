"use client";

import { useRef } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const LEN = 6;

export default function OtpInput({ value, onChange, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(LEN, " ").slice(0, LEN).split("");

  function setDigit(index: number, char: string) {
    const d = char.replace(/\D/g, "").slice(-1);
    const next = digits.map((c, i) => (i === index ? d || " " : c));
    const joined = next.map((c) => (c === " " ? "" : c)).join("");
    onChange(joined.slice(0, LEN));
    if (d && index < LEN - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LEN);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, LEN) - 1;
    requestAnimationFrame(() => refs.current[focusIndex]?.focus());
  }

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={d.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="w-11 h-[52px] border-[1.5px] border-muted/40 rounded-lg text-center text-xl font-medium text-surface bg-light focus:border-accent focus:outline-none"
          aria-label={`Digit ${i + 1}`}
        />
      ))}
    </div>
  );
}
