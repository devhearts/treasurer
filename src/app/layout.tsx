import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    <html lang="en">
      <body className={`${geist.variable} antialiased bg-gray-50 font-sans`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
