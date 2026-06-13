"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/Icons";

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  label?: string;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "Password",
  required,
  minLength,
  autoComplete,
  label = "Password",
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full border border-muted/50 rounded-lg px-4 py-3 pr-11 text-surface placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-surface focus:outline-none focus:ring-2 focus:ring-accent rounded"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <IconEyeOff className="h-5 w-5" />
        ) : (
          <IconEye className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
