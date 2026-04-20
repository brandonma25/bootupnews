# Artifact 10 Parity Repair

## Scope
- Repair visual drift left after the Artifact 10 global style pass.
- Keep the current `main` AppShell and homepage coexistence model.
- Do not revive or merge stale PRD-43 through PRD-49 component branches.

## Discrepancies Found
- Tailwind config was missing the Artifact 10 `content` and `plugins` shape and still carried drifted custom font-size aliases.
- Global body and briefing-title line heights were tighter than Artifact 10.
- Button text inherited normal UI line-height instead of the required 1.00 button line-height.
- Inputs were styled as white card surfaces instead of the warm Artifact 10 input background.
- Homepage and AppShell still exposed session/status presentation that looked like debug/state UI rather than polished product chrome.
- Several non-briefing headings used oversized ad hoc type outside the Artifact 10 scale.

## Fixes Applied
- Restored Artifact 10 Tailwind token intent for colors, font families, font sizes, max width, radius, content paths, and plugins.
- Tightened global typography helpers so Lora remains limited to briefing titles and briefing-detail titles with the exact Artifact 10 line heights.
- Added global input, textarea, and select border/background/focus rules matching Artifact 10.
- Enforced button line-height and preserved primary/secondary interactive states.
- Removed the homepage session-state banner and the AppShell top status strip/mode panel.
- Reworked affected tests to assert the polished header/account state instead of the removed session-state UI.

## Intentionally Unchanged
- No backend, auth provider, Supabase, RSS, ranking, ingestion, or data contract behavior changed.
- Homepage debug tooling remains gated behind explicit debug configuration rather than displayed in normal product UI.
- The current mobile drawer model remains in place because current `main`, not stale PRD-43 branches, is the source of truth for this repair.

## Validation Notes
- Local validation is required before PR readiness: install, lint, focused component tests, build, dev server, and route smoke checks for `/`, `/dashboard`, `/history`, `/topics`, `/sources`, and `/settings`.
- Preview validation remains required for auth, cookies, SSR/hydration, responsive layout, and signed-in versus signed-out behavior.
