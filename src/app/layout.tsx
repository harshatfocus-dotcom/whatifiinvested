import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "WhatIfIInvested - Stop Wondering, Start Investing",
  description: "Discover what your money could've earned. A regret-to-insight tool that shows how portfolio would have evolved using actual historical performance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`min-h-full flex flex-col font-sans ${inter.variable}`} style={{ background: "#F5F5F7", color: "#1D1D1F", fontVariantNumeric: "tabular-nums" }}>
        {children}
      </body>
    </html>
  );
}
