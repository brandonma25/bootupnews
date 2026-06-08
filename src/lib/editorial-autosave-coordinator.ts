/**
 * Tiny client-side coordinator that lets consequential actions (Include,
 * Publish) flush any *pending* editorial autosave before they read the
 * persisted `edited_*` content.
 *
 * Background: the editor autosaves the three editorial layers on a ~1.5s
 * debounce. The Include toggle and the Publish gate both act on the
 * already-persisted DB content, so if a user types and then clicks Include
 * (or Publish) within the debounce window, the action would read STALE
 * content while the autosave is still pending. Each mounted editor registers
 * a `flush()` (which cancels its debounce timer and writes immediately); the
 * action `await`s the relevant flush first, closing the race.
 *
 * Module-level state is intentional: the editorial composer is a single
 * client surface, and the registry only ever holds the currently-expanded
 * editors. Flushers self-unregister on unmount.
 */
type AutosaveFlusher = () => Promise<void>;

const flushers = new Map<string, AutosaveFlusher>();

/** Register a card's flush fn. Returns an unregister cleanup. */
export function registerAutosaveFlusher(postId: string, flush: AutosaveFlusher): () => void {
  flushers.set(postId, flush);
  return () => {
    if (flushers.get(postId) === flush) {
      flushers.delete(postId);
    }
  };
}

/** Flush the pending autosave for one card (no-op if none registered). */
export async function flushPendingAutosave(postId: string): Promise<void> {
  await flushers.get(postId)?.();
}

/** Flush every currently-open editor's pending autosave (used before publish). */
export async function flushAllPendingAutosaves(): Promise<void> {
  await Promise.all(Array.from(flushers.values(), (flush) => flush()));
}
