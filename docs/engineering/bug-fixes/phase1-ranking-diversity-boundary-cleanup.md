# Ranking and Diversity Boundary Cleanup

## Root Cause

The earlier donor framework marked FNS as the ranking donor and exposed a future-ready diversity hook, but real ranking feature assembly still lived inline in the canonical scorer and diversity had not yet been activated.

## Fix

- introduced canonical ranking feature, diversity, and ranking-debug contracts
- moved donor-backed feature mapping behind the FNS ranking feature provider
- activated deterministic post-cluster diversity penalties after canonical base scoring
- kept final score math and ranked selection canonical to the website scorer

## Remaining Risks

- diversity is active, but still heuristic and intentionally conservative
- trust/ranking behavior still depends on source metadata quality from earlier stages
