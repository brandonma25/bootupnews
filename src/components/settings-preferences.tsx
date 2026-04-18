"use client";

import { useMemo, useState } from "react";
import { Bell, Clock3, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { Panel } from "@/components/ui/panel";
import {
  buildPersonalizationSummary,
  createDefaultPersonalizationProfile,
  formatSavedAtLabel,
  persistPersonalizationProfile,
  readStoredPersonalizationState,
  type BriefingPersonalizationProfile,
  type PersonalizationTopicOption,
} from "@/lib/personalization";

type SettingsPreferencesProps = {
  defaultEmail?: string;
  availableTopics: PersonalizationTopicOption[];
  suggestedEntities: string[];
  signedIn: boolean;
};

export function SettingsPreferences({
  defaultEmail,
  availableTopics,
  suggestedEntities,
  signedIn,
}: SettingsPreferencesProps) {
  const defaultState = useMemo<BriefingPersonalizationProfile>(
    () => createDefaultPersonalizationProfile(defaultEmail),
    [defaultEmail],
  );
  const storedState = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        profile: defaultState,
        savedAt: null,
        version: 1,
      };
    }

    return readStoredPersonalizationState(
      window.localStorage.getItem("daily-intel-preferences"),
      defaultEmail,
    );
  }, [defaultEmail, defaultState]);
  const [preferences, setPreferences] = useState<BriefingPersonalizationProfile>(storedState.profile);
  const [savedAt, setSavedAt] = useState<string | null>(storedState.savedAt);
  const [statusMessage, setStatusMessage] = useState(
    storedState.savedAt ? formatSavedAtLabel(storedState.savedAt) : "Not saved on this browser yet.",
  );
  const [entityInput, setEntityInput] = useState("");

  const personalizationSummary = buildPersonalizationSummary(preferences);
  const hasUnsavedChanges = JSON.stringify(preferences) !== JSON.stringify(storedState.profile);
  const trackedTopicCount = dedupeStrings([
    ...preferences.followedTopicIds,
    ...preferences.followedTopicNames,
  ]).length;
  const followedEntityCount = preferences.followedEntities.length;

  function updatePreference<K extends keyof BriefingPersonalizationProfile>(
    key: K,
    value: BriefingPersonalizationProfile[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }));
    setStatusMessage("Changes not saved yet.");
  }

  function toggleTopic(option: PersonalizationTopicOption) {
    setPreferences((current) => {
      const idSet = new Set(current.followedTopicIds);
      const nameSet = new Set(current.followedTopicNames);
      const alreadyTracked = idSet.has(option.id) || nameSet.has(option.label);

      if (alreadyTracked) {
        idSet.delete(option.id);
        nameSet.delete(option.label);
      } else {
        idSet.add(option.id);
        nameSet.add(option.label);
      }

      return {
        ...current,
        followedTopicIds: [...idSet],
        followedTopicNames: [...nameSet],
      };
    });
    setStatusMessage("Changes not saved yet.");
  }

  function addEntity(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setPreferences((current) => ({
      ...current,
      followedEntities: dedupeStrings([...current.followedEntities, trimmed]),
    }));
    setEntityInput("");
    setStatusMessage("Changes not saved yet.");
  }

  function removeEntity(value: string) {
    setPreferences((current) => ({
      ...current,
      followedEntities: current.followedEntities.filter(
        (entity) => entity.toLowerCase() !== value.toLowerCase(),
      ),
    }));
    setStatusMessage("Changes not saved yet.");
  }

  function savePreferences() {
    const result = persistPersonalizationProfile(preferences);
    setSavedAt(result?.savedAt ?? null);
    setStatusMessage(formatSavedAtLabel(result?.savedAt ?? null));
  }

  function resetPreferences() {
    setPreferences(defaultState);
    setEntityInput("");
    setStatusMessage("Reset locally. Save to apply these defaults on this browser.");
  }

  return (
    <Panel className="p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Personal settings
          </p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">
            Tune your personal briefing
          </h3>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {signedIn
              ? "Set the topics and entities that should pull strong events a little higher, while the confirmed-event quality floor stays intact."
              : "These preferences save on this browser for now. Sign in to use them across the full briefing flow."}
          </p>
        </div>
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)]/60 px-4 py-3 text-sm text-[var(--foreground)]">
          {statusMessage}
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Personalization status
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge label={preferences.personalizationEnabled ? "Ranking on" : "Ranking off"} active={preferences.personalizationEnabled} />
            <StatusBadge label={`${trackedTopicCount} ${trackedTopicCount === 1 ? "topic" : "topics"}`} active={trackedTopicCount > 0} />
            <StatusBadge label={`${followedEntityCount} ${followedEntityCount === 1 ? "entity" : "entities"}`} active={followedEntityCount > 0} />
            <StatusBadge label={hasUnsavedChanges ? "Unsaved changes" : "Saved state"} active={!hasUnsavedChanges} />
          </div>
          <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--panel)]/45 p-4 text-sm leading-6 text-[var(--muted)]">
            <p>
              {personalizationSummary
                ? `${personalizationSummary}. Strong matching events can move up, but weak or single-source items still stay constrained.`
                : "No active priorities yet. Add a few focused preferences to make the briefing feel more tailored."}
            </p>
            <p className="mt-2">{savedAt ? formatSavedAtLabel(savedAt) : "Nothing has been saved on this browser yet."}</p>
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Briefing effect
          </p>
          <h4 className="mt-2 text-lg font-semibold text-[var(--foreground)]">How the ranking changes</h4>
          <div className="mt-4 space-y-2 rounded-[20px] border border-[var(--line)] bg-[var(--panel)]/45 p-4 text-sm leading-6 text-[var(--muted)]">
            <p>Confirmed multi-source events still dominate Top Events.</p>
            <p>Matching priorities can move strong events higher for you.</p>
            <p>Early Signals stay separate even when they match your interests.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <FeaturePlaceholder
          icon={UserRound}
          title="Profile details"
          description="Display name, default landing page, and reading layout stay read-only until account-backed settings are ready."
          note="These profile controls are intentionally hidden for now so the page only shows settings that already do something."
        />

        <div className="rounded-[22px] border border-[var(--line)] bg-white/70 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Personalized ranking</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Keep event quality first, then let your priorities shape the order.
              </p>
            </div>
            <button
              type="button"
              aria-pressed={preferences.personalizationEnabled}
              onClick={() => updatePreference("personalizationEnabled", !preferences.personalizationEnabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                preferences.personalizationEnabled ? "bg-[var(--foreground)]" : "bg-[var(--line)]"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  preferences.personalizationEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <FeaturePlaceholder
          icon={Bell}
          title="Delivery cadence"
          description="Digest timing, reminder schedules, and delivery preferences are still being built."
          note="We removed inactive toggles here so the page no longer implies email or refresh automation is live today."
        />

        <FeaturePlaceholder
          icon={Clock3}
          title="Feed refresh controls"
          description="Automatic refresh timing and live polling controls are planned for a later release."
          note="Live feed updates still follow the existing product defaults until those controls are wired end to end."
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Topic preferences
          </p>
          <h4 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Choose what should pull harder</h4>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Keep this list tight. A few focused priorities produce the clearest personalization.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableTopics.map((topic) => {
              const selected =
                preferences.followedTopicIds.includes(topic.id) ||
                preferences.followedTopicNames.includes(topic.label);

              return (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? "border-[rgba(41,79,134,0.25)] bg-[rgba(41,79,134,0.10)] text-[#294f86]"
                      : "border-[var(--line)] bg-white text-[var(--foreground)] hover:bg-[var(--panel)]"
                  }`}
                >
                  {selected ? "Tracking" : "Track"} {topic.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Save behavior
          </p>
          <h4 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Local for now, explicit by design</h4>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Preferences currently save to this browser. That keeps the foundation safe and predictable while account-backed persistence stays a follow-up.
          </p>
          <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--panel)]/45 p-4 text-sm leading-6 text-[var(--muted)]">
            <p>{hasUnsavedChanges ? "You have unsaved changes on this device." : "Your saved browser state matches the current selections."}</p>
            <p className="mt-2">{savedAt ? formatSavedAtLabel(savedAt) : "Nothing has been saved on this browser yet."}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-white/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Followed entities
        </p>
        <h4 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Add entities you want surfaced faster</h4>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Use this for companies, institutions, leaders, or products you actively watch.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={entityInput}
            onChange={(event) => setEntityInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addEntity(entityInput);
              }
            }}
            className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-sm outline-none"
            placeholder="Add an entity like Nvidia or Federal Reserve"
          />
          <Button type="button" onClick={() => addEntity(entityInput)} className="whitespace-nowrap">
            Add entity
          </Button>
        </div>

        {preferences.followedEntities.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {preferences.followedEntities.map((entity) => (
              <button
                key={entity}
                type="button"
                onClick={() => removeEntity(entity)}
                className="rounded-full border border-[rgba(41,79,134,0.18)] bg-[rgba(41,79,134,0.08)] px-3 py-2 text-sm text-[#294f86]"
              >
                {entity} ×
              </button>
            ))}
          </div>
        ) : null}

        {suggestedEntities.length ? (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Suggested from current briefing
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {suggestedEntities.map((entity) => (
                <button
                  key={entity}
                  type="button"
                  onClick={() => addEntity(entity)}
                  className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:bg-[var(--panel)]"
                >
                  Follow {entity}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="button" onClick={savePreferences}>
          {hasUnsavedChanges ? "Save preferences" : "Saved on this browser"}
        </Button>
        <Button type="button" variant="secondary" onClick={resetPreferences}>
          Reset
        </Button>
        {hasUnsavedChanges ? (
          <p className="text-sm text-[var(--muted)]">Save to apply these changes on this browser.</p>
        ) : null}
      </div>
    </Panel>
  );
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-[rgba(41,79,134,0.18)] bg-[rgba(41,79,134,0.08)] text-[#294f86]"
          : "border-[var(--line)] bg-white text-[var(--muted)]"
      }`}
    >
      {label}
    </span>
  );
}

function dedupeStrings(values: string[]) {
  return values.filter((value, index) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    return values.findIndex((candidate) => candidate.trim().toLowerCase() === normalized) === index;
  });
}
