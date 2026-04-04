import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WealthBacktest - Time Travel Your Investments",
  description: "Discover what your money could've earned in India's stock market. Backtest your investment strategies with real historical data.",
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
