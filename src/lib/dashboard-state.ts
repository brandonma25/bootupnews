import { format, formatDistanceToNowStrict, isToday, parseISO } from "date-fns";

import type { DashboardData, DashboardViewState } from "@/lib/types";

export function getDashboardViewState(data: Pick<DashboardData, "briefing">): Exclude<DashboardViewState, "loading"> {
  return data.briefing.items.length > 0 ? "ready" : "empty";
}

export function getDashboardStateCopy(
  state: DashboardViewState,
  briefingIntro?: string,
) {
  if (state === "loading") {
    return {
      title: "Fetching your intelligence…",
      description: "We’re refreshing your dashboard and pulling the latest signals into view.",
    };
  }

  if (state === "empty") {
    return {
      title: "Setting up your feed (10–20 seconds)…",
      description: "Your dashboard is still preparing its first usable briefing. We’ll keep checking so it turns live as soon as content is ready.",
    };
  }

  return {
    title: "Today’s Briefing",
    description:
      briefingIntro ??
      "Related reporting is clustered into events so you can scan developments instead of isolated articles.",
  };
}

export function formatDashboardLastUpdated(value: string, now = new Date()) {
  const timestamp = parseISO(value);

  if (Number.isNaN(timestamp.getTime())) {
    return "Last updated just now";
  }

  const minutesAgo = Math.round((now.getTime() - timestamp.getTime()) / 60000);

  if (minutesAgo <= 0) {
    return "Last updated just now";
  }

  if (minutesAgo < 60) {
    return `Updated ${formatDistanceToNowStrict(timestamp, { addSuffix: true })}`;
  }

  if (isToday(timestamp)) {
    return `Last updated: ${format(timestamp, "h:mm a")}`;
  }

  return `Last updated: ${format(timestamp, "MMM d, h:mm a")}`;
}
