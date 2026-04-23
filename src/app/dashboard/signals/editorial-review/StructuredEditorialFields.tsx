"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  buildEditorialWhyItMattersText,
  createEditorialContentFromLegacyText,
  getEditorialHomepagePreviewText,
  getEditorialSectionSlots,
  normalizeEditorialWhyItMattersContent,
  type EditorialWhyItMattersContent,
} from "@/lib/editorial-content";

type StructuredEditorialFieldsProps = {
  postId: string;
  aiWhyItMatters: string;
  legacyText: string;
  structuredContent: EditorialWhyItMattersContent | null;
  eligibleForApproveAll: boolean;
};

export function StructuredEditorialFields({
  postId,
  aiWhyItMatters,
  legacyText,
  structuredContent,
  eligibleForApproveAll,
}: StructuredEditorialFieldsProps) {
  const initialContent =
    structuredContent ?? createEditorialContentFromLegacyText(legacyText || aiWhyItMatters);
  const initialSections = getEditorialSectionSlots(initialContent);
  const [homepagePreview, setHomepagePreview] = useState(initialContent?.preview ?? "");
  const [thesis, setThesis] = useState(initialContent?.thesis ?? (legacyText || aiWhyItMatters));
  const [sectionTitles, setSectionTitles] = useState(initialSections.map((section) => section.title));
  const [sectionBodies, setSectionBodies] = useState(initialSections.map((section) => section.body));
  const [previewMode, setPreviewMode] = useState<"collapsed" | "expanded">("collapsed");
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
  const collapsedPreview = getEditorialHomepagePreviewText(content, fullEditorialText);
  const structuredJson = JSON.stringify(content);

  return (
    <div className="space-y-5">
      <input
        type="hidden"
        name="editedWhyItMatters"
        value={fullEditorialText}
        data-approve-all-post-id={eligibleForApproveAll ? postId : undefined}
        readOnly
      />
      <input
        type="hidden"
        name="structuredWhyItMatters"
        value={structuredJson}
        data-approve-all-structured-post-id={eligibleForApproveAll ? postId : undefined}
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
            help="The first expanded statement. Frame the executive takeaway here."
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
              <p className="text-sm font-semibold text-[var(--text-primary)]">Structured argument sections</p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                Use only the sections you need. Empty slots are ignored.
              </p>
            </div>
            {sectionTitles.map((title, index) => (
              <div key={index} className="rounded-card border border-[var(--border)] bg-[var(--bg)] p-3">
                <label className="text-sm font-semibold text-[var(--text-primary)]">
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
                <label className="mt-3 block text-sm font-semibold text-[var(--text-primary)]">
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
                    "rounded-button px-3 py-1.5 text-xs font-semibold capitalize",
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
              <p className="mt-2 line-clamp-3 text-base leading-7 text-[var(--text-primary)]">
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
                    <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
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
      <label htmlFor={id} className="text-sm font-semibold text-[var(--text-primary)]">
        {label}
      </label>
      <span className="mt-1 block text-sm leading-6 text-[var(--text-secondary)]">{help}</span>
      <span className="mt-2 block">{children}</span>
    </div>
  );
}
