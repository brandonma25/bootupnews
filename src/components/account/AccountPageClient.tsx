"use client";

import { useState } from "react";

import {
  addAccountFeedAction,
  removeAccountFeedAction,
  saveAccountCategoryPreferencesAction,
  setNewsletterPreferenceAction,
  signOutAction,
} from "@/app/actions";
import {
  CategoryPreferenceCheckboxes,
  type AccountCategoryKey,
} from "@/components/account/CategoryPreferenceCheckboxes";
import { NewsletterToggle } from "@/components/account/NewsletterToggle";
import { RSSFeedEmptyState } from "@/components/account/RSSFeedEmptyState";
import { RSSFeedInput } from "@/components/account/RSSFeedInput";
import { RSSFeedRow } from "@/components/account/RSSFeedRow";
import { SavePreferencesButton } from "@/components/account/SavePreferencesButton";
import { UserProfileBlock } from "@/components/account/UserProfileBlock";
import { Panel } from "@/components/ui/panel";
import type { AccountPreferenceSnapshot } from "@/lib/data";
import type { Source, ViewerAccount } from "@/lib/types";

type AccountFeed = {
  feed_id: string;
  url: string;
  label?: string;
};

type AccountPageClientProps = {
  viewer: ViewerAccount;
  sources: Source[];
  preferences: AccountPreferenceSnapshot;
};

function toAccountFeeds(sources: Source[]): AccountFeed[] {
  return sources.map((source) => ({
    feed_id: source.id,
    url: source.feedUrl,
    label: source.name,
  }));
}

export function AccountPageClient({
  viewer,
  sources,
  preferences,
}: AccountPageClientProps) {
  const [feeds, setFeeds] = useState(() => toAccountFeeds(sources));
  const [savedCategories, setSavedCategories] = useState<AccountCategoryKey[]>(
    preferences.categories,
  );
  const [currentCategories, setCurrentCategories] = useState<AccountCategoryKey[]>(
    preferences.categories,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [categorySaveSuccess, setCategorySaveSuccess] = useState(false);
  const [categorySaveError, setCategorySaveError] = useState<string | null>(
    preferences.storageReady ? null : preferences.storageMessage ?? null,
  );
  const categoriesDirty = currentCategories.join(",") !== savedCategories.join(",");

  async function handleAddFeed(url: string) {
    const result = await addAccountFeedAction(url);
    if (!result.ok || !result.feed) {
      throw new Error(result.message);
    }

    setFeeds((currentFeeds) => {
      const withoutDuplicate = currentFeeds.filter((feed) => feed.feed_id !== result.feed.feed_id);
      return [result.feed, ...withoutDuplicate];
    });
  }

  async function handleRemoveFeed(feedId: string) {
    const result = await removeAccountFeedAction(feedId);
    if (!result.ok) {
      throw new Error(result.message);
    }

    setFeeds((currentFeeds) => currentFeeds.filter((feed) => feed.feed_id !== feedId));
  }

  async function handleSaveCategories() {
    setIsSavingCategories(true);
    setCategorySaveSuccess(false);
    setCategorySaveError(null);

    const result = await saveAccountCategoryPreferencesAction(currentCategories);

    if (result.ok && result.categories) {
      setSavedCategories(result.categories);
      setCurrentCategories(result.categories);
      setCategorySaveSuccess(true);
    } else {
      setCategorySaveError(result.message);
    }

    setIsSavingCategories(false);
  }

  async function handleNewsletterToggle(enabled: boolean) {
    const result = await setNewsletterPreferenceAction(enabled);
    if (!result.ok) {
      throw new Error(result.message);
    }
  }

  return (
    <div className="space-y-5">
      <UserProfileBlock
        user={{
          name: viewer.displayName,
          email: viewer.email,
          avatarUrl: viewer.avatarUrl,
        }}
        isLoading={false}
        isSigningOut={isSigningOut}
        onSignOut={() => {
          setIsSigningOut(true);
          void signOutAction();
        }}
      />

      <Panel className="p-5">
        <div className="space-y-2">
          <p className="section-label">RSS feeds</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Sources</h2>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Add RSS feeds that should be considered for your briefing.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <RSSFeedInput onAdd={handleAddFeed} />
          {feeds.length ? (
            <div className="space-y-3">
              {feeds.map((feed) => (
                <RSSFeedRow key={feed.feed_id} feed={feed} onRemove={handleRemoveFeed} />
              ))}
            </div>
          ) : (
            <RSSFeedEmptyState />
          )}
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="space-y-2">
          <p className="section-label">Category preferences</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Briefing categories</h2>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Choose the V1 categories that should stay available in your signed-in briefing.
          </p>
        </div>
        <div className="mt-5 space-y-4">
          <CategoryPreferenceCheckboxes
            saved={savedCategories}
            current={currentCategories}
            disabled={isSavingCategories}
            onChange={(updated) => {
              setCurrentCategories(updated);
              setCategorySaveSuccess(false);
              setCategorySaveError(null);
            }}
          />
          <SavePreferencesButton
            isDirty={categoriesDirty}
            isSaving={isSavingCategories}
            isSuccess={categorySaveSuccess}
            error={categorySaveError}
            onSave={handleSaveCategories}
          />
        </div>
      </Panel>

      <Panel className="p-5">
        <div className="space-y-2">
          <p className="section-label">Newsletter</p>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Daily digest</h2>
          <p className="max-w-2xl text-sm text-[var(--text-secondary)]">
            Save whether this account should receive the daily newsletter when delivery infrastructure is enabled.
          </p>
        </div>
        <div className="mt-5">
          <NewsletterToggle
            enabled={preferences.newsletterEnabled}
            onToggle={handleNewsletterToggle}
          />
        </div>
      </Panel>
    </div>
  );
}
