import { subDays } from "date-fns";

import type { DashboardData, DailyBriefing, Source, Topic } from "@/lib/types";

const today = new Date().toISOString();

export const demoTopics: Topic[] = [
  {
    id: "topic-ai",
    name: "AI",
    description: "Model launches, regulation, enterprise adoption, and product shifts.",
    color: "#1F4F46",
  },
  {
    id: "topic-markets",
    name: "Markets",
    description: "Macro signals, public markets, and earnings-related moves.",
    color: "#73563c",
  },
  {
    id: "topic-geopolitics",
    name: "Geopolitics",
    description: "Major policy shifts, conflict risk, and cross-border power moves.",
    color: "#2e4257",
  },
  {
    id: "topic-product",
    name: "Product",
    description: "Product strategy, platform updates, and operator lessons.",
    color: "#5f4d72",
  },
];

export const demoSources: Source[] = [
  {
    id: "source-ft",
    name: "Financial Times",
    feedUrl: "https://www.ft.com/rss/home",
    homepageUrl: "https://www.ft.com",
    topicId: "topic-markets",
    topicName: "Markets",
    status: "active",
  },
  {
    id: "source-verge",
    name: "The Verge",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    homepageUrl: "https://www.theverge.com",
    topicId: "topic-ai",
    topicName: "AI",
    status: "active",
  },
  {
    id: "source-economist",
    name: "The Economist",
    feedUrl: "https://www.economist.com/international/rss.xml",
    homepageUrl: "https://www.economist.com",
    topicId: "topic-geopolitics",
    topicName: "Geopolitics",
    status: "active",
  },
  {
    id: "source-lenny",
    name: "Lenny's Newsletter",
    feedUrl: "https://www.lennysnewsletter.com/feed",
    homepageUrl: "https://www.lennysnewsletter.com",
    topicId: "topic-product",
    topicName: "Product",
    status: "active",
  },
];

export const demoBriefing: DailyBriefing = {
  id: "briefing-today",
  briefingDate: today,
  title: "Daily Executive Briefing",
  intro:
    "A focused scan of the handful of stories most likely to change product, market, and strategic decisions today.",
  readingWindow: "34 minutes",
  items: [
    {
      id: "item-1",
      topicId: "topic-ai",
      topicName: "AI",
      title: "Enterprise buyers are shifting from model experiments to workflow automation",
      whatHappened:
        "A growing share of AI spending is moving away from pure model access and toward practical software layers that automate repeatable work inside existing teams.",
      keyPoints: [
        "Budgets are consolidating around fewer vendors with clearer ROI.",
        "Buyers want AI embedded into existing systems rather than new standalone tools.",
        "Procurement teams are pushing harder on security, auditability, and usage controls.",
      ],
      whyItMatters:
        "This is a signal that the market is entering a more operational phase. Winning products will look less like generic assistants and more like reliable systems that save time in specific workflows.",
      sources: [
        { title: "The Verge", url: "https://www.theverge.com" },
        { title: "Financial Times", url: "https://www.ft.com" },
      ],
      estimatedMinutes: 5,
      read: false,
      priority: "top",
    },
    {
      id: "item-2",
      topicId: "topic-markets",
      topicName: "Markets",
      title: "Investors are rewarding businesses with clearer margin discipline",
      whatHappened:
        "Recent market reactions suggest investors are giving more credit to companies that can show durable efficiency alongside revenue growth, rather than growth alone.",
      keyPoints: [
        "Cost structure is getting more attention in earnings commentary.",
        "Guidance quality is affecting market confidence almost as much as headline revenue.",
        "AI spend is being scrutinized through a payback lens.",
      ],
      whyItMatters:
        "For founders and operators, this environment favors products that can prove business impact quickly. It also raises the bar for how companies narrate strategic investments.",
      sources: [
        { title: "Financial Times", url: "https://www.ft.com" },
      ],
      estimatedMinutes: 4,
      read: true,
      priority: "top",
    },
    {
      id: "item-3",
      topicId: "topic-geopolitics",
      topicName: "Geopolitics",
      title: "Policy competition is increasingly shaping tech supply chains",
      whatHappened:
        "Technology, industrial policy, and national security are becoming more tightly linked, creating a more fragmented global operating environment for companies.",
      keyPoints: [
        "Governments are using incentives and restrictions more aggressively.",
        "Cross-border expansion now carries higher regulatory and compliance overhead.",
        "Supply-chain resilience is becoming a board-level issue rather than an ops issue.",
      ],
      whyItMatters:
        "Even early-stage companies can feel this through vendor risk, customer procurement, and market-entry choices. Strategic planning now has to account for policy shifts much earlier.",
      sources: [
        { title: "The Economist", url: "https://www.economist.com" },
      ],
      estimatedMinutes: 4,
      read: false,
      priority: "normal",
    },
    {
      id: "item-4",
      topicId: "topic-product",
      topicName: "Product",
      title: "The strongest product teams are tightening their weekly decision loops",
      whatHappened:
        "Operators are relying more on shorter review cycles, sharper prioritization, and visible tradeoff calls instead of large planning rituals that drift away from execution.",
      keyPoints: [
        "Teams are reducing roadmap sprawl and clarifying what will not be built.",
        "Quality of weekly decision-making is overtaking long-range planning theater.",
        "Cross-functional alignment works better when decisions are documented simply.",
      ],
      whyItMatters:
        "This favors lean operating models. An intelligence product like this one should feel the same way: focused, repeatable, and built for action rather than information overload.",
      sources: [
        { title: "Lenny's Newsletter", url: "https://www.lennysnewsletter.com" },
      ],
      estimatedMinutes: 3,
      read: false,
      priority: "normal",
    },
  ],
};

export const demoHistory: DailyBriefing[] = [
  demoBriefing,
  {
    ...demoBriefing,
    id: "briefing-yesterday",
    briefingDate: subDays(new Date(), 1).toISOString(),
    title: "Daily Executive Briefing",
  },
  {
    ...demoBriefing,
    id: "briefing-two-days",
    briefingDate: subDays(new Date(), 2).toISOString(),
    title: "Daily Executive Briefing",
  },
];

export const demoDashboardData: DashboardData = {
  mode: "demo",
  briefing: demoBriefing,
  topics: demoTopics,
  sources: demoSources,
};
