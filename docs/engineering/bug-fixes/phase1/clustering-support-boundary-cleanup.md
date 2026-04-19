# Clustering Support Boundary Cleanup

## Root Cause

The earlier donor framework marked after-market-agent as the clustering donor, but the real candidate preparation, similarity logic, merge support, and representative selection were still inline inside the canonical clustering module.

## Fix

- introduced explicit clustering contracts for candidates, similarity signals, merge support, and representative selection
- moved clustering support logic behind the after-market-agent provider boundary
- kept final `SignalCluster` assembly canonical in `src/lib/pipeline/clustering/index.ts`
- added a safe FNS diversity-support hook without changing clustering ownership

## Remaining Risks

- clustering logic is now better partitioned, but still intentionally deterministic and heuristic-driven
- FNS diversity support is only a future-ready hook for now
