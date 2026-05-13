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
  demoted?: boolean;
  className?: string;
};

const topEventsTab: CategoryTab = {
  key: "top-events",
  label: "Today's signals",
};

export function CategoryTabStrip({
  topEvents,
  categorySections,
  renderTopEvent,
  renderCategoryEvent,
  renderCategoryArticle,
  topEventsEmptyState,
  isAuthenticated = true,
  gatedCategoryState,
  demoted = false,
  className,
}: CategoryTabStripProps) {
  const triggerRefs = useRef<Partial<Record<HomeTabKey, HTMLButtonElement | null>>>({});
  const visibleCategorySections = useMemo(() => categorySections, [categorySections]);
  const initialTab = demoted ? visibleCategorySections[0]?.key ?? topEventsTab.key : topEventsTab.key;
  const [activeTab, setActiveTab] = useState<HomeTabKey>(initialTab);
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
    (!demoted && activeTab === topEventsTab.key) ||
    visibleCategorySections.some((section) => section.key === activeTab);
  const safeActiveTab = activeTabIsVisible
    ? activeTab
    : demoted
      ? visibleCategorySections[0]?.key ?? topEventsTab.key
      : topEventsTab.key;
  const activeCategoryIsGated = !isAuthenticated && safeActiveTab !== topEventsTab.key;
  const activeSection =
    safeActiveTab === topEventsTab.key
      ? null
      : visibleCategorySections.find((section) => section.key === safeActiveTab) ?? null;

  const dismissGate = () => {
    setActiveTab(topEventsTab.key);
  };

  useEffect(() => {
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
        <div className="space-y-[var(--bu-space-3)]">
          <h2
            className="text-[var(--bu-size-card-title-mobile)] font-medium leading-tight tracking-[-0.015em] text-[var(--bu-text-primary)] md:text-[var(--bu-size-card-title)]"
            data-testid="browse-by-heading"
          >
            Browse by category
          </h2>
          <div className="flex flex-wrap items-center gap-x-[var(--bu-space-5)] gap-y-[var(--bu-space-2)]">
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
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
              onClick={() => setActiveTab(tab.key)}
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
        const sectionHasArticles = (section.articles?.length ?? 0) > 0 && Boolean(renderCategoryArticle);
        const sectionHasEvents = section.events.length > 0;
        const sectionHasContent = sectionHasArticles || sectionHasEvents;
        const shouldRenderGate =
          activeCategoryIsGated && safeActiveTab === section.key && sectionHasContent;
        const sectionContent = (
          <div className="grid gap-4">
            {sectionHasArticles && renderCategoryArticle ? (
              section.articles.map((article, index) => (
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
