"use client";

import { useState } from "react";

interface FloatingLabelInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "date" | "number";
  required?: boolean;
  placeholder?: string;
  hint?: string;
  inputMode?: "numeric" | "text";
  min?: number;
}

export default function FloatingLabelInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  hint,
  inputMode,
  min,
}: FloatingLabelInputProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value.trim().length > 0;
  const float = focused || hasValue;

  return (
    <div className="relative">
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          required={required}
          placeholder={float ? undefined : placeholder}
          inputMode={inputMode}
          min={min}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="peer w-full border border-muted/50 rounded-lg px-4 pt-5 pb-2 h-14 text-surface placeholder-transparent focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-base bg-light"
        />
        <label
          htmlFor={id}
          className={`absolute left-4 transition-all duration-150 pointer-events-none text-muted ${
            float
              ? "top-2 text-xs font-medium"
              : "top-1/2 -translate-y-1/2 text-base"
          }`}
        >
          {label}
          {required && " *"}
        </label>
      </div>
      {hint && focused && (
        <p
          id={`${id}-hint`}
          className="mt-2 text-xs text-muted px-1"
          role="status"
        >
          {hint}
        </p>
      )}
    </div>
  );
}
