"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { HomepageCategorySection, HomepageEvent } from "@/lib/homepage-model";
import type { HomepageCategoryArticle } from "@/lib/types";
import type { HomepageCategoryKey } from "@/lib/homepage-taxonomy";
import { cn } from "@/lib/utils";

type TopEventsTabKey = "top-events";
type CategoryTabKey = HomepageCategoryKey;
type HomeTabKey = TopEventsTabKey | CategoryTabKey;

type CategoryTab = {
  key: HomeTabKey;
  label: string;
};

type CategoryArticleLoadState =
  | { status: "idle"; articles: HomepageCategoryArticle[]; error?: undefined }
  | { status: "loading"; articles: HomepageCategoryArticle[]; error?: undefined }
  | { status: "loaded"; articles: HomepageCategoryArticle[]; error?: undefined }
  | { status: "error"; articles: HomepageCategoryArticle[]; error: string };

type CategoryArticlesApiResponse =
  | {
      ok: true;
      category: HomepageCategoryKey;
      articles: HomepageCategoryArticle[];
    }
  | {
      ok: false;
      error: string;
    };

type GatedCategoryStateArgs = {
  onDismiss: () => void;
  activeSection: HomepageCategorySection | null;
};

export type CategoryTabStripProps = {
  topEvents: HomepageEvent[];
  categorySections: HomepageCategorySection[];
  renderTopEvent: (event: HomepageEvent, index: number) => ReactNode;
  renderCategoryEvent: (
    event: HomepageEvent,
    section: HomepageCategorySection,
    index: number,
  ) => ReactNode;
  renderCategoryArticle?: (
    article: HomepageCategoryArticle,
    section: HomepageCategorySection,
    index: number,
  ) => ReactNode;
  topEventsEmptyState?: ReactNode;
  isAuthenticated?: boolean;
  gatedCategoryState?: ReactNode | ((args: GatedCategoryStateArgs) => ReactNode);
  progressiveCategoryArticles?: boolean;
  categoryArticleEndpoint?: string;
  demoted?: boolean;
  className?: string;
};

const topEventsTab: CategoryTab = {
  key: "top-events",
  label: "Today's signals",
};

function isCategoryTabKey(key: HomeTabKey): key is HomepageCategoryKey {
  return key !== topEventsTab.key;
}

export function CategoryTabStrip({
  topEvents,
  categorySections,
  renderTopEvent,
  renderCategoryEvent,
  renderCategoryArticle,
  topEventsEmptyState,
  isAuthenticated = true,
  gatedCategoryState,
  progressiveCategoryArticles = false,
  categoryArticleEndpoint = "/api/home/category-articles",
  demoted = false,
  className,
}: CategoryTabStripProps) {
  const triggerRefs = useRef<Partial<Record<HomeTabKey, HTMLButtonElement | null>>>({});
  const visibleCategorySections = useMemo(() => categorySections, [categorySections]);
  const initialTab = progressiveCategoryArticles && demoted
    ? null
    : demoted
      ? visibleCategorySections[0]?.key ?? topEventsTab.key
      : topEventsTab.key;
  const [activeTab, setActiveTab] = useState<HomeTabKey | null>(initialTab);
  const [categoryArticleState, setCategoryArticleState] = useState<
    Partial<Record<HomepageCategoryKey, CategoryArticleLoadState>>
  >({});
  const tabs = useMemo(
    () => {
      const categoryTabs = visibleCategorySections.map((section) => ({
        key: section.key,
        label: section.label,
      }));

      return demoted ? categoryTabs : [topEventsTab, ...categoryTabs];
    },
    [demoted, visibleCategorySections],
  );
  const activeTabIsVisible =
    (progressiveCategoryArticles && demoted && activeTab === null) ||
    (!demoted && activeTab === topEventsTab.key) ||
    visibleCategorySections.some((section) => section.key === activeTab);
  const safeActiveTab: HomeTabKey | null = activeTabIsVisible
    ? activeTab
    : demoted
      ? progressiveCategoryArticles
        ? null
        : visibleCategorySections[0]?.key ?? topEventsTab.key
      : topEventsTab.key;
  const activeCategoryIsGated =
    !progressiveCategoryArticles &&
    !isAuthenticated &&
    safeActiveTab !== null &&
    safeActiveTab !== topEventsTab.key;
  const activeSection =
    safeActiveTab === null || safeActiveTab === topEventsTab.key
      ? null
      : visibleCategorySections.find((section) => section.key === safeActiveTab) ?? null;

  const dismissGate = () => {
    setActiveTab(progressiveCategoryArticles && demoted ? null : topEventsTab.key);
  };

  const loadCategoryArticles = async (category: HomepageCategoryKey, force = false) => {
    const current = categoryArticleState[category];

    if (!force && (current?.status === "loading" || current?.status === "loaded")) {
      return;
    }

    setCategoryArticleState((previous) => ({
      ...previous,
      [category]: {
        status: "loading",
        articles: previous[category]?.articles ?? [],
      },
    }));

    try {
      const response = await fetch(`${categoryArticleEndpoint}?category=${encodeURIComponent(category)}`, {
        headers: {
          accept: "application/json",
        },
      });
      const body = (await response.json()) as CategoryArticlesApiResponse;

      if (!response.ok || !body.ok || body.category !== category || !Array.isArray(body.articles)) {
        throw new Error(body.ok ? "Unexpected category response." : body.error);
      }

      setCategoryArticleState((previous) => ({
        ...previous,
        [category]: {
          status: "loaded",
          articles: body.articles,
        },
      }));
    } catch (error) {
      setCategoryArticleState((previous) => ({
        ...previous,
        [category]: {
          status: "error",
          articles: previous[category]?.articles ?? [],
          error: error instanceof Error ? error.message : "Category articles could not be loaded.",
        },
      }));
    }
  };

  const selectTab = (tab: CategoryTab) => {
    setActiveTab(tab.key);

    if (progressiveCategoryArticles && isCategoryTabKey(tab.key)) {
      void loadCategoryArticles(tab.key);
    }
  };

  useEffect(() => {
    if (safeActiveTab === null) {
      return;
    }

    triggerRefs.current[safeActiveTab]?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  }, [safeActiveTab]);

  const topEventsContent = topEvents.length ? (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
      {topEvents.map((event, index) => (
        <div key={event.id} className={cn(index === 0 ? "xl:col-span-7" : "xl:col-span-5")}>
          {renderTopEvent(event, index)}
        </div>
      ))}
    </div>
  ) : (
    topEventsEmptyState
  );
  const renderedGatedCategoryState =
    typeof gatedCategoryState === "function"
      ? gatedCategoryState({ onDismiss: dismissGate, activeSection })
      : gatedCategoryState;

  if (demoted && visibleCategorySections.length === 0) {
    return null;
  }

  return (
    <Tabs className={className}>
      {demoted ? (
        <div
          className="flex flex-wrap items-center gap-x-[var(--bu-space-5)] gap-y-[var(--bu-space-2)]"
          role="group"
          aria-label="Categories"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              ref={(node) => {
                triggerRefs.current[tab.key] = node;
              }}
              type="button"
              className={cn(
                "text-[var(--bu-size-ui)] leading-5 transition-colors",
                safeActiveTab === tab.key
                  ? "font-medium text-[var(--bu-text-primary)] underline decoration-[var(--bu-accent)] decoration-2 underline-offset-[6px]"
                  : "font-normal text-[var(--bu-text-secondary)] hover:text-[var(--bu-accent)]",
              )}
              aria-controls={`${tab.key}-panel`}
              aria-current={safeActiveTab === tab.key ? "page" : undefined}
              data-mvp-measurement-event={tab.key === topEventsTab.key ? undefined : "category_tab_open"}
              data-mvp-route={tab.key === topEventsTab.key ? undefined : "/"}
              data-mvp-surface={tab.key === topEventsTab.key ? undefined : "home_category_tab"}
              data-mvp-category={tab.key === topEventsTab.key ? undefined : tab.key}
              onClick={() => selectTab(tab)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : (
        <TabsList className="-mx-4 px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              ref={(node) => {
                triggerRefs.current[tab.key] = node;
              }}
              active={safeActiveTab === tab.key}
              aria-controls={`${tab.key}-panel`}
              data-mvp-measurement-event={tab.key === topEventsTab.key ? undefined : "category_tab_open"}
              data-mvp-route={tab.key === topEventsTab.key ? undefined : "/"}
              data-mvp-surface={tab.key === topEventsTab.key ? undefined : "home_category_tab"}
              data-mvp-category={tab.key === topEventsTab.key ? undefined : tab.key}
              onClick={() => selectTab(tab)}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      )}

      {!demoted ? (
        <TabsContent id="top-events-panel" active={safeActiveTab === topEventsTab.key}>
          {topEventsContent}
        </TabsContent>
      ) : null}

      {visibleCategorySections.map((section) => {
        const articleState = categoryArticleState[section.key] ?? {
          status: "idle",
          articles: [],
        };
        const progressiveArticles = progressiveCategoryArticles
          ? articleState.articles
          : section.articles ?? [];
        const sectionHasArticles = progressiveArticles.length > 0 && Boolean(renderCategoryArticle);
        const sectionHasEvents = !progressiveCategoryArticles && section.events.length > 0;
        const sectionHasContent = sectionHasArticles || sectionHasEvents;
        const shouldRenderGate =
          activeCategoryIsGated && safeActiveTab === section.key && sectionHasContent;
        const sectionContent = progressiveCategoryArticles ? (
          <ProgressiveCategoryContent
            section={section}
            state={articleState}
            renderCategoryArticle={renderCategoryArticle}
            onRetry={() => loadCategoryArticles(section.key, true)}
          />
        ) : (
          <div className="grid gap-4">
            {sectionHasArticles && renderCategoryArticle ? (
              progressiveArticles.map((article, index) => (
                <div key={article.id}>{renderCategoryArticle(article, section, index)}</div>
              ))
            ) : sectionHasEvents ? (
              section.events.map((event, index) => (
                <div key={event.id}>{renderCategoryEvent(event, section, index)}</div>
              ))
            ) : (
              <div
                className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-sm text-[var(--text-secondary)]"
                role="status"
              >
                {section.emptyReason}
              </div>
            )}
          </div>
        );

        return (
          <TabsContent
            key={section.key}
            id={`${section.key}-panel`}
            active={safeActiveTab === section.key}
            className={demoted ? "mt-[var(--bu-space-4)]" : undefined}
          >
            {shouldRenderGate ? (
              <div className="space-y-5">
                {renderedGatedCategoryState}
                {sectionContent}
              </div>
            ) : (
              sectionContent
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

function ProgressiveCategoryContent({
  section,
  state,
  renderCategoryArticle,
  onRetry,
}: {
  section: HomepageCategorySection;
  state: CategoryArticleLoadState;
  renderCategoryArticle?: (
    article: HomepageCategoryArticle,
    section: HomepageCategorySection,
    index: number,
  ) => ReactNode;
  onRetry: () => void;
}) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div
        className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-sm text-[var(--text-secondary)]"
        role="status"
      >
        Loading {section.label.toLowerCase()} stories...
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div
        className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-sm text-[var(--text-secondary)]"
        role="alert"
      >
        <p>Could not load {section.label.toLowerCase()} stories.</p>
        <button
          type="button"
          className="mt-3 text-sm font-medium text-[var(--bu-accent)] transition-colors hover:text-[var(--bu-accent-hover)]"
          onClick={onRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  if (state.articles.length === 0 || !renderCategoryArticle) {
    return (
      <div
        className="rounded-card border border-[var(--border)] bg-[var(--card)] px-4 py-5 text-sm text-[var(--text-secondary)]"
        role="status"
      >
        No {section.label.toLowerCase()} stories available right now.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {state.articles.map((article, index) => (
        <div key={article.id}>{renderCategoryArticle(article, section, index)}</div>
      ))}
    </div>
  );
}
