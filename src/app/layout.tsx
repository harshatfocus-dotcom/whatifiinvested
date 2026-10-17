import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "WhatIfIInvested — Historical Backtesting",
  description: "Explore how real investments would have performed. Test strategies, compare assets, and understand what drove the outcome.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`min-h-full flex flex-col font-sans ${inter.variable}`} style={{ background: "#F2F3F5", color: "#111827", fontVariantNumeric: "tabular-nums", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
