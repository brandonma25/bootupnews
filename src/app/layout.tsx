import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Intelligence Aggregator",
  description: "A premium daily intelligence dashboard for high-signal briefings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
