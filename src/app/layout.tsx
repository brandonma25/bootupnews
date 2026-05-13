import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Inter_Tight, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--bu-font-sans",
  weight: ["400", "500"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--bu-font-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
});

const enableVercelAnalytics = process.env.VERCEL === "1";
const enableVercelSpeedInsights = process.env.VERCEL === "1";

export const metadata: Metadata = {
  title: "Bootup News",
  description:
    "Ranked daily signals for people who want to understand the world, not just consume it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${interTight.variable} ${sourceSerif.variable} antialiased`}>
      <body className="min-h-screen font-sans">
        {children}
        {enableVercelAnalytics ? <Analytics /> : null}
        {enableVercelSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
