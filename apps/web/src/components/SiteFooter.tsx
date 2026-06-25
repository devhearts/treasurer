import Link from "next/link";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site";

interface SiteFooterProps {
  className?: string;
  /** Wider container for legal pages. */
  wide?: boolean;
}

export default function SiteFooter({
  className = "",
  wide = false,
}: SiteFooterProps) {
  const containerClass = wide ? "max-w-3xl" : "max-w-lg";

  return (
    <footer
      className={`bg-surface text-light/70 py-6 mt-auto ${className}`.trim()}
    >
      <div
        className={`${containerClass} mx-auto px-4 text-center text-sm space-y-2`}
      >
        <p>
          <span className="font-semibold text-light">CeremonyWallet</span>
          <span className="mx-2">·</span>
          <span>Making fundraising seamless.</span>
        </p>
        <p>
          <Link
            href="/terms"
            className="text-light/90 hover:text-light hover:underline"
          >
            Terms and Conditions
          </Link>
          <span className="mx-2">·</span>
          <a
            href={SUPPORT_MAILTO}
            className="text-light/90 hover:text-light hover:underline"
          >
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </footer>
  );
}
