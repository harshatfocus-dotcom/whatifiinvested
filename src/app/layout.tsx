import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="min-h-full flex flex-col bg-background-primary">
        {children}
      </body>
    </html>
  );
}
