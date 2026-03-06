import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  weight: "variable",
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CeremonyWallet – Digital Treasurer for Ugandan Social Events",
  description:
    "Manage contributions for weddings, introductions (kwanjula), and funerals (mabugo) transparently. Collect via Mobile Money, track pledges, and keep everyone informed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
