import type { ReactNode } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const enableVercelSpeedInsights = process.env.VERCEL === "1";

export default function Template({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <>
      {children}
      {enableVercelSpeedInsights ? <SpeedInsights /> : null}
    </>
  );
}
