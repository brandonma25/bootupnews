"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { HomepageCategorySection, HomepageEvent } from "@/lib/homepage-model";
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
  topEventsEmptyState?: ReactNode;
  isAuthenticated?: boolean;
  gatedCategoryState?: ReactNode | ((args: GatedCategoryStateArgs) => ReactNode);
  className?: string;
};

const topEventsTab: CategoryTab = {
  key: "top-events",
  label: "Top Events",
};

export function CategoryTabStrip({
  topEvents,
  categorySections,
  renderTopEvent,
  renderCategoryEvent,
  topEventsEmptyState,
  isAuthenticated = true,
  gatedCategoryState,
  className,
}: CategoryTabStripProps) {
  const [activeTab, setActiveTab] = useState<HomeTabKey>(topEventsTab.key);
  const triggerRefs = useRef<Partial<Record<HomeTabKey, HTMLButtonElement | null>>>({});
  const visibleCategorySections = useMemo(() => categorySections, [categorySections]);
  const tabs = useMemo(
    () => [
      topEventsTab,
      ...visibleCategorySections.map((section) => ({
        key: section.key,
        label: section.key === "tech" ? "Tech News" : section.label,
      })),
    ],
    [visibleCategorySections],
  );
  const activeTabIsVisible =
    activeTab === topEventsTab.key || visibleCategorySections.some((section) => section.key === activeTab);
  const safeActiveTab = activeTabIsVisible ? activeTab : topEventsTab.key;
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

  return (
    <Tabs className={className}>
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

      <TabsContent id="top-events-panel" active={safeActiveTab === topEventsTab.key}>
        {topEventsContent}
      </TabsContent>

      {visibleCategorySections.map((section) => (
        <TabsContent
          key={section.key}
          id={`${section.key}-panel`}
          active={safeActiveTab === section.key}
        >
          {activeCategoryIsGated ? (
            <div className="space-y-5">
              {renderedGatedCategoryState}
              <div className="grid gap-4">
                {section.events.length ? (
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
            </div>
          ) : (
            <div className="grid gap-4">
              {section.events.length ? (
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
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
