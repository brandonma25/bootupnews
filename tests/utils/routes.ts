export type AuditRoute = {
  name: string;
  path: string;
  slug: string;
  navLabel: string;
  heading: RegExp;
};

export const coreRoutes: AuditRoute[] = [
  {
    name: "Home",
    path: "/",
    slug: "home",
    navLabel: "Home",
    heading: /preview a structured intelligence briefing/i,
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    slug: "dashboard",
    navLabel: "Today",
    heading: /today's public briefing|full briefing workspace/i,
  },
  {
    name: "Topics",
    path: "/topics",
    slug: "topics",
    navLabel: "Topics",
    heading: /choose the areas that deserve attention/i,
  },
  {
    name: "History",
    path: "/history",
    slug: "history",
    navLabel: "History",
    heading: /review previous daily briefings/i,
  },
  {
    name: "Sources",
    path: "/sources",
    slug: "sources",
    navLabel: "Sources",
    heading: /track the feeds that matter/i,
  },
  {
    name: "Settings",
    path: "/settings",
    slug: "settings",
    navLabel: "Settings",
    heading: /connect the services that power the live product|account and app settings/i,
  },
];

export const appShellRoutes = coreRoutes.filter((route) => route.path !== "/");
