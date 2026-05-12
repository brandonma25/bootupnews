export type AuditRoute = {
  name: string;
  path: string;
  slug: string;
  navLabel?: string;
  heading: RegExp;
  expectedPath?: string;
  expectedSearchParams?: Record<string, string>;
  urlMatches?: (url: URL) => boolean;
};

function matchesAccountAuthRedirect(url: URL) {
  return (
    url.pathname === "/account" ||
    (url.pathname === "/login" && url.searchParams.get("redirectTo") === "/account")
  );
}

export const coreRoutes: AuditRoute[] = [
  {
    name: "Home",
    path: "/",
    slug: "home",
    navLabel: "Home",
    heading: /Today's signals/i,
  },
  {
    name: "Dashboard",
    path: "/dashboard",
    slug: "dashboard",
    heading: /Today's signals/i,
    expectedPath: "/",
  },
  {
    name: "History",
    path: "/history",
    slug: "history",
    navLabel: "History",
    heading: /Past briefings|Sign in to view briefing history/i,
  },
  {
    name: "Account",
    path: "/account",
    slug: "account",
    navLabel: "Account",
    heading: /sign in/i,
    urlMatches: matchesAccountAuthRedirect,
  },
  {
    name: "Topics",
    path: "/topics",
    slug: "topics",
    heading: /sign in/i,
    urlMatches: matchesAccountAuthRedirect,
  },
  {
    name: "Sources",
    path: "/sources",
    slug: "sources",
    heading: /sign in/i,
    urlMatches: matchesAccountAuthRedirect,
  },
  {
    name: "Settings",
    path: "/settings",
    slug: "settings",
    heading: /sign in/i,
    urlMatches: matchesAccountAuthRedirect,
  },
];

export const appShellRoutes = coreRoutes.filter((route) => Boolean(route.navLabel));
