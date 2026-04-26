"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Save,
  Send,
} from "lucide-react";

import {
  approveSignalPostAction,
  publishSignalPostAction,
  resetSignalPostToAiDraftAction,
  saveSignalDraftAction,
} from "@/app/dashboard/signals/editorial-review/actions";
import { StructuredEditorialFields } from "@/app/dashboard/signals/editorial-review/StructuredEditorialFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { EditorialSignalPost } from "@/lib/signals-editorial";

type SignalPostEditorProps = {
  post: EditorialSignalPost;
  storageReady: boolean;
};

export function SignalPostEditor({ post, storageReady }: SignalPostEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const editableText = post.editedWhyItMatters || post.publishedWhyItMatters || post.aiWhyItMatters;
  const structuredContent =
    post.editedWhyItMattersStructured ?? post.publishedWhyItMattersStructured;
  const controlsDisabled = !storageReady || !post.persisted;
  const eligibleForApproveAll =
    post.persisted && ["draft", "needs_review"].includes(post.editorialStatus);
  const canPublishPost = post.editorialStatus === "approved";
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
                <span className="flex h-9 w-9 items-center justify-center rounded-card bg-[var(--sidebar)] text-sm font-semibold text-[var(--text-primary)]">
                  {post.rank}
                </span>
                {post.briefingDate ? <Badge>{post.briefingDate}</Badge> : null}
                <Badge>{formatStatus(post.editorialStatus)}</Badge>
                {post.isLive ? <Badge>Live homepage set</Badge> : null}
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
              <h2 className="text-xl font-semibold leading-7 text-[var(--text-primary)]">{post.title}</h2>
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
          </div>
        </div>

        <div id={panelId} hidden={!isExpanded} className="space-y-5">
          <StructuredEditorialFields
            postId={post.id}
            aiWhyItMatters={post.aiWhyItMatters}
            legacyText={editableText}
            structuredContent={structuredContent}
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
            <Button
              type="submit"
              formAction={approveSignalPostAction}
              disabled={controlsDisabled}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>
            {canPublishPost ? (
              <Button
                type="submit"
                formAction={publishSignalPostAction}
                disabled={controlsDisabled}
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                Publish
              </Button>
            ) : null}
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

function getPostStateHint(post: EditorialSignalPost) {
  if (post.editorialStatus === "approved") {
    return "Approved and waiting to publish. Publish this card or use Publish Top 5 Signals when the full Top 5 is ready.";
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
