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
  title: "Boot Up",
  description:
    "Curated daily intelligence for ambitious readers. Ranked signals with structured reasoning to understand the world, not just follow it.",
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
