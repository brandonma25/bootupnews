import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const enableVercelAnalytics = process.env.VERCEL === "1";
const enableVercelSpeedInsights = process.env.VERCEL === "1";

export const metadata: Metadata = {
  title: "Daily Intelligence Briefing",
  description: "A premium daily intelligence dashboard for high-signal briefings.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lora.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        {children}
        {enableVercelAnalytics ? <Analytics /> : null}
        {enableVercelSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
