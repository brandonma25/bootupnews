import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Intelligence Aggregator",
  description:
    "A premium daily intelligence dashboard for high-signal briefings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
