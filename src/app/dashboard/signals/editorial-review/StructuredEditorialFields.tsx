"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  RotateCcw,
  Save,
} from "lucide-react";

import {
  approveSignalPostAction,
  holdSignalPostAction,
  rejectSignalPostAction,
  republishLiveSignalPostAction,
  requestRewriteAction,
  resetSignalPostToAiDraftAction,
  saveSignalDraftAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

import {
  buildIntentionalEditorialPreview,
  buildEditorialWhyItMattersText,
  createEditorialContentFromLegacyText,
  getEditorialHomepagePreviewText,
  getEditorialSectionSlots,
  normalizeEditorialWhyItMattersContent,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

type StructuredEditorialFieldsProps = {
  postId: string;
  aiWhyItMatters: string;
  legacyText: string;
  structuredContent: EditorialWhyItMattersContent | null;
  /**
   * Initial Before This (`what_led_to_it`) text the editor sees in the
   * textarea (#274). Pre-filled from edited_*, then published_*, then
   * human_*, then ai_* — first non-empty wins. Editor saves write to
   * edited_what_led_to_it via the form action.
   */
  initialEditedWhatLedToIt: string;
  /**
   * Initial The Ripple (`what_it_connects_to`) text the editor sees in
   * the textarea (#274). Same precedence as initialEditedWhatLedToIt.
   */
  initialEditedWhatItConnectsTo: string;
  /**
   * Vestigial prop. The previous bulk-approve flow scraped this row's
   * hidden inputs from the DOM when this flag was true. That coupling
   * was removed when the bulk-approve form moved up to
   * EditorialComposerClient and started rendering explicit hidden
   * inputs from React state. The prop is preserved so consumers don't
   * break; the next scoped cleanup can drop it.
   */
  eligibleForApproveAll: boolean;
};

type SignalPostEditorProps = {
  post: EditorialSignalPost;
  storageReady: boolean;
  defaultExpanded?: boolean;
};

export function SignalPostEditor({ post, storageReady, defaultExpanded = false }: SignalPostEditorProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const editableText = post.editedWhyItMatters || post.publishedWhyItMatters || post.aiWhyItMatters;
  const structuredContent =
    post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;
  // Before This / The Ripple (#274). Pre-fill the editor with the most
  // editorially-trustworthy source available: prior edited copy, then a
  // previously-published version, then the bridge's human override, then
  // the AI draft. The editor can wipe to a clean slate by clearing the
  // textarea before saving — empty string clears the layer at save time.
  const initialEditedWhatLedToIt =
    post.editedWhatLedToIt ?? post.publishedWhatLedToIt ?? post.humanWhatLedToIt ?? post.aiWhatLedToIt ?? "";
  const initialEditedWhatItConnectsTo =
    post.editedWhatItConnectsTo ??
    post.publishedWhatItConnectsTo ??
    post.humanWhatItConnectsTo ??
    post.aiWhatItConnectsTo ??
    "";
  const controlsDisabled = !storageReady || !post.persisted;
  const decisionControlsDisabled =
    controlsDisabled || post.isLive || post.editorialStatus === "published" || Boolean(post.publishedAt);
  const eligibleForApproveAll =
    post.persisted &&
    ["draft", "needs_review"].includes(post.editorialStatus) &&
    post.whyItMattersValidationStatus !== "requires_human_rewrite" &&
    !isBlockingDecision(post.editorialDecision);
  const requiresHumanRewrite = post.whyItMattersValidationStatus === "requires_human_rewrite";
  // #282 — A card that is currently published+live MUST flow through
  // Re-publish for any update. Approve flips editorial_status to
  // 'approved' without touching published_*, which removes the card
  // from the public homepage query (which requires status='published').
  // Hide Approve on live cards so that footgun is gone; Re-publish is
  // the correct control.
  const isCurrentlyLivePublished =
    post.isLive && post.editorialStatus === "published" && Boolean(post.publishedAt);
  const toggleLabel = isExpanded ? "Collapse" : "Expand";
  const panelId = `editorial-panel-${post.id}`;

  return (
    <Panel className="p-5">
      <form className="space-y-5">
        <input type="hidden" name="postId" value={post.id} />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-card bg-[var(--sidebar)] text-sm font-medium text-[var(--text-primary)]">
                  {post.rank}
                </span>
                {post.briefingDate ? <Badge>{post.briefingDate}</Badge> : null}
                <Badge>{formatStatus(post.editorialStatus)}</Badge>
                <Badge>{formatDecision(post.editorialDecision)}</Badge>
                <Badge>{requiresHumanRewrite ? "WITM rewrite required" : "WITM passed"}</Badge>
                {post.finalSlateRank ? <Badge>Selected for final slate</Badge> : null}
                {post.finalSlateTier ? <Badge>{formatStatus(post.finalSlateTier)}</Badge> : null}
                {post.replacementOfRowId ? <Badge>Replacement</Badge> : null}
                {post.isLive ? <Badge>Live homepage set</Badge> : null}
                {post.publishedAt ? <Badge>Published warning</Badge> : null}
                {post.signalScore !== null ? <Badge>Score {Math.round(post.signalScore)}</Badge> : null}
                {post.tags.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                aria-expanded={isExpanded}
                aria-controls={panelId}
                onClick={() => setIsExpanded((value) => !value)}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {toggleLabel}
              </Button>
            </div>
            <div>
              <h2 className="text-xl font-medium leading-7 text-[var(--text-primary)]">{post.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
                <span>{post.sourceName || "Unknown source"}</span>
                {post.sourceUrl ? (
                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    Source URL
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{post.summary}</p>
            {post.selectionReason ? (
              <div className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
                <p className="section-label">Selection reason</p>
                <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{post.selectionReason}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
            <p className="section-label">AI-generated reference</p>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">{post.aiWhyItMatters}</p>
            {requiresHumanRewrite ? (
              <div className="rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
                <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <AlertTriangle className="h-4 w-4" />
                  Quality gate reasons
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {post.whyItMattersValidationDetails.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        <div id={panelId} hidden={!isExpanded} className="space-y-5">
          <StructuredEditorialFields
            postId={post.id}
            aiWhyItMatters={post.aiWhyItMatters}
            legacyText={editableText}
            structuredContent={structuredContent}
            initialEditedWhatLedToIt={initialEditedWhatLedToIt}
            initialEditedWhatItConnectsTo={initialEditedWhatItConnectsTo}
            eligibleForApproveAll={eligibleForApproveAll}
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              formAction={saveSignalDraftAction}
              variant="secondary"
              disabled={controlsDisabled}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Edits
            </Button>
            {/* #282 Approve hidden on currently-live-published cards
                — see isCurrentlyLivePublished comment. Re-publish is
                the safe path. */}
            {isCurrentlyLivePublished ? null : (
              <Button
                type="submit"
                formAction={approveSignalPostAction}
                disabled={controlsDisabled}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </Button>
            )}
            <Button
              type="submit"
              formAction={resetSignalPostToAiDraftAction}
              variant="ghost"
              disabled={controlsDisabled}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to AI Draft
            </Button>
            {/* #280 Re-publish-in-place control. Only enabled for cards
                that are CURRENTLY published + live. Snapshots the prior
                published_* into previous_published_snapshot, overwrites
                from edited_*. Validation gate (WITM passed) still applies.
                Distinct from the slate-publish button (which only handles
                never-published cards). */}
            {isCurrentlyLivePublished ? (
              <Button
                type="submit"
                formAction={republishLiveSignalPostAction}
                variant="secondary"
                disabled={controlsDisabled || requiresHumanRewrite}
                className="gap-2"
                data-testid="republish-live-card"
              >
                <RefreshCw className="h-4 w-4" />
                Re-publish live card
              </Button>
            ) : null}
          </div>
          <div className="space-y-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
            <label htmlFor={`decisionNote-${post.id}`} className="text-sm font-medium text-[var(--text-primary)]">
              Editorial decision note
              <textarea
                id={`decisionNote-${post.id}`}
                name="decisionNote"
                defaultValue={post.decisionNote ?? post.rejectedReason ?? post.heldReason ?? ""}
                rows={3}
                placeholder="Required for reject, hold, and replacement decisions."
                className="mt-2 w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                formAction={requestRewriteAction}
                variant="secondary"
                disabled={decisionControlsDisabled}
              >
                Request Rewrite
              </Button>
              <Button
                type="submit"
                formAction={rejectSignalPostAction}
                variant="secondary"
                disabled={decisionControlsDisabled}
              >
                Reject
              </Button>
              <Button
                type="submit"
                formAction={holdSignalPostAction}
                variant="secondary"
                disabled={decisionControlsDisabled}
              >
                Hold
              </Button>
            </div>
          </div>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {getPostStateHint(post)}
          </p>
          <Button
            type="button"
            variant="ghost"
            className="gap-2"
            aria-expanded={isExpanded}
            aria-controls={panelId}
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="h-4 w-4" />
            Collapse
          </Button>
        </div>
      </form>
    </Panel>
  );
}

export function StructuredEditorialFields({
  postId,
  aiWhyItMatters,
  legacyText,
  structuredContent,
  initialEditedWhatLedToIt,
  initialEditedWhatItConnectsTo,
  // Vestigial after the bulk-approve refactor; see prop docs above.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eligibleForApproveAll: _eligibleForApproveAll,
}: StructuredEditorialFieldsProps) {
  const initialContent =
    structuredContent ?? createEditorialContentFromLegacyText(legacyText || aiWhyItMatters);
  const initialSections = getEditorialSectionSlots(initialContent);
  const [homepagePreview, setHomepagePreview] = useState(initialContent?.preview ?? "");
  const [thesis, setThesis] = useState(initialContent?.thesis ?? (legacyText || aiWhyItMatters));
  const [sectionTitles, setSectionTitles] = useState(initialSections.map((section) => section.title));
  const [sectionBodies, setSectionBodies] = useState(initialSections.map((section) => section.body));
  const [previewMode, setPreviewMode] = useState<"collapsed" | "expanded">("collapsed");
  // #274 Before This / The Ripple. These are simple textareas wired to
  // hidden form fields the server actions read into edited_what_led_to_it
  // and edited_what_it_connects_to. We do not yet expose a structured
  // editor for these layers; the lib derives a legacy-text payload
  // server-side when the structured content is undefined.
  const [editedWhatLedToIt, setEditedWhatLedToIt] = useState(initialEditedWhatLedToIt);
  const [editedWhatItConnectsTo, setEditedWhatItConnectsTo] = useState(
    initialEditedWhatItConnectsTo,
  );
  const content = useMemo(
    () =>
      normalizeEditorialWhyItMattersContent({
        preview: homepagePreview,
        thesis,
        sections: sectionTitles.map((title, index) => ({
          title,
          body: sectionBodies[index] ?? "",
        })),
      }),
    [homepagePreview, sectionBodies, sectionTitles, thesis],
  );
  const fullEditorialText = buildEditorialWhyItMattersText(content, legacyText || aiWhyItMatters);
  const collapsedPreview = buildIntentionalEditorialPreview(
    getEditorialHomepagePreviewText(content, fullEditorialText),
    220,
  );
  const structuredJson = JSON.stringify(content);

  return (
    <div className="space-y-5">
      <input
        type="hidden"
        name="editedWhyItMatters"
        value={fullEditorialText}
        readOnly
      />
      <input
        type="hidden"
        name="structuredWhyItMatters"
        value={structuredJson}
      />
      {/* #274 Before This + The Ripple — hidden form fields wired to the
          textareas below. We post empty string when cleared so the server
          knows the editor intentionally wiped the layer (vs. unchanged). */}
      <input
        type="hidden"
        name="editedWhatLedToIt"
        value={editedWhatLedToIt}
        readOnly
      />
      <input
        type="hidden"
        name="editedWhatItConnectsTo"
        value={editedWhatItConnectsTo}
        readOnly
      />

      {/* The Signal — the lead editorial layer (why it matters). The rich
          structured editor below composes the homepage teaser/expanded
          payload; its hidden inputs (above) save to edited_why_it_matters. */}
      <LayerHeading
        title="The Signal"
        help="Why it matters — the lead layer. Saves to edited_why_it_matters and is promoted to published_why_it_matters on publish. The homepage teaser and expanded view render from this layer."
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <div className="space-y-4">
          <FieldBlock
            id={`homepagePreview-${postId}`}
            label="Homepage teaser / collapsed preview"
            help="Short, editor-authored copy for the collapsed homepage card."
          >
            <textarea
              id={`homepagePreview-${postId}`}
              name="homepagePreview"
              value={homepagePreview}
              onChange={(event) => setHomepagePreview(event.target.value)}
              rows={3}
              className="w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </FieldBlock>

          <FieldBlock
            id={`editorialThesis-${postId}`}
            label="Thesis / opening statement"
            help="The first expanded statement. Frame the main point here."
          >
            <textarea
              id={`editorialThesis-${postId}`}
              name="editorialThesis"
              value={thesis}
              onChange={(event) => setThesis(event.target.value)}
              rows={4}
              className="w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
            />
          </FieldBlock>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Structured argument sections</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Use only the sections you need. Empty slots are ignored.
              </p>
            </div>
            {sectionTitles.map((title, index) => (
              <div key={index} className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Section {index + 1} title
                  <input
                    name="sectionTitle"
                    value={title}
                    onChange={(event) =>
                      setSectionTitles((current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    className="mt-2 w-full rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
                <label className="mt-3 block text-sm font-medium text-[var(--text-primary)]">
                  Section {index + 1} body
                  <textarea
                    name="sectionBody"
                    value={sectionBodies[index] ?? ""}
                    onChange={(event) =>
                      setSectionBodies((current) =>
                        current.map((value, currentIndex) =>
                          currentIndex === index ? event.target.value : value,
                        ),
                      )
                    }
                    rows={3}
                    className="mt-2 w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-card border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="section-label">Homepage preview simulation</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Mirrors the collapsed and expanded homepage states.
              </p>
            </div>
            <div className="inline-flex rounded-button border border-[var(--border)] bg-[var(--card)] p-1">
              {(["collapsed", "expanded"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={[
                    "rounded-button px-3 py-1.5 text-xs font-medium capitalize",
                    previewMode === mode
                      ? "bg-[var(--text-primary)] text-white"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {previewMode === "collapsed" ? (
            <div className="rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="section-label">Collapsed homepage version</p>
              <p className="mt-2 text-base leading-7 text-[var(--text-primary)]">
                {collapsedPreview}
              </p>
            </div>
          ) : (
            <div className="space-y-4 rounded-card border border-[var(--border)] bg-[var(--card)] p-3">
              <p className="section-label">Expanded homepage version</p>
              {content?.thesis ? (
                <p className="text-base font-medium leading-7 text-[var(--text-primary)]">{content.thesis}</p>
              ) : null}
              {content?.sections.map((section, index) => (
                <section key={`${index}-${section.title}`} className="space-y-1.5 border-l-2 border-[var(--border)] pl-3">
                  {section.title ? (
                    <h3 className="text-sm font-medium uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                      {section.title}
                    </h3>
                  ) : null}
                  {section.body ? (
                    <p className="text-sm leading-6 text-[var(--text-primary)]">{section.body}</p>
                  ) : null}
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* #274 Before This + The Ripple. Simple textareas, no structured
          editor — the publish gate writes both the text and a
          legacy-text-derived payload to published_what_*. The editor can
          clear either layer by emptying the textarea before saving.
          Presented as two labeled peer sections after The Signal, so the
          three layers read in order: The Signal → Before This → The Ripple. */}
      <div className="border-t border-[var(--border)] pt-5">
        <FieldBlock
          id={`editedWhatLedToIt-${postId}`}
          label="Before This"
          help="Causal / preceding context (what led to this). Saves to edited_what_led_to_it; promoted to published_what_led_to_it on publish. Leave empty to suppress the layer from the public foldback."
        >
          <textarea
            id={`editedWhatLedToIt-${postId}`}
            value={editedWhatLedToIt}
            onChange={(event) => setEditedWhatLedToIt(event.target.value)}
            rows={5}
            className="w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
          />
        </FieldBlock>
      </div>
      <div className="border-t border-[var(--border)] pt-5">
        <FieldBlock
          id={`editedWhatItConnectsTo-${postId}`}
          label="The Ripple"
          help="Trajectory / downstream implications (what it connects to). Saves to edited_what_it_connects_to; promoted to published_what_it_connects_to on publish. Leave empty to suppress the layer from the public foldback."
        >
          <textarea
            id={`editedWhatItConnectsTo-${postId}`}
            value={editedWhatItConnectsTo}
            onChange={(event) => setEditedWhatItConnectsTo(event.target.value)}
            rows={5}
            className="w-full resize-y rounded-card border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-6 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)]"
          />
        </FieldBlock>
      </div>
    </div>
  );
}

function FieldBlock({
  id,
  label,
  help,
  children,
}: {
  id: string;
  label: string;
  help: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">{help}</span>
      <span className="mt-2 block">{children}</span>
    </div>
  );
}

/**
 * Section heading for a top-level editorial layer. Mirrors FieldBlock's
 * label + help typography so the three layers — The Signal, Before This,
 * The Ripple — read as uniform peer sections. Used for The Signal, which
 * wraps a composite editor rather than a single labelled input; Before
 * This / The Ripple reuse FieldBlock directly.
 */
function LayerHeading({ title, help }: { title: string; help: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
      <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">{help}</span>
    </div>
  );
}

function getPostStateHint(post: EditorialSignalPost) {
  if (post.editorialDecision === "rejected") {
    return "Rejected rows stay available in admin history and cannot be selected for the final slate.";
  }

  if (post.editorialDecision === "held") {
    return "Held rows are retained as editorial evidence and cannot be selected for the final slate.";
  }

  if (post.editorialDecision === "rewrite_requested") {
    return "Rewrite-requested rows stay in admin review and cannot pass final-slate readiness.";
  }

  if (post.whyItMattersValidationStatus === "requires_human_rewrite") {
    return "Rewrite the Why it matters copy and approve again before this card can publish.";
  }

  if (post.editorialStatus === "approved") {
    return "Approved and waiting for the final-slate publish gate.";
  }

  if (post.editorialStatus === "published") {
    return "Published copy is live for public signal surfaces. Saving edits to this card updates the published copy.";
  }

  return "Save edits as a draft or approve this card before publishing.";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDecision(decision: string | null) {
  return decision ? formatStatus(decision) : "Needs review";
}

function isBlockingDecision(decision: string | null) {
  return (
    decision === "rejected" ||
    decision === "held" ||
    decision === "rewrite_requested" ||
    decision === "removed_from_slate"
  );
}
