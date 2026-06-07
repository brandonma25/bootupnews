import { describe, expect, it } from "vitest";

import { DEFAULT_SURFACE_POOL_SIZE, resolveSurfacePoolSize } from "@/lib/pipeline/surface-pool";

describe("resolveSurfacePoolSize (PRD-53 editorial pool ceiling)", () => {
  it("defaults to 22 when SURFACE_POOL_SIZE is unset", () => {
    expect(DEFAULT_SURFACE_POOL_SIZE).toBe(22);
    expect(resolveSurfacePoolSize({} as NodeJS.ProcessEnv)).toBe(22);
  });

  it("honours a valid positive override", () => {
    expect(resolveSurfacePoolSize({ SURFACE_POOL_SIZE: "30" } as unknown as NodeJS.ProcessEnv)).toBe(30);
  });

  it("floors fractional values", () => {
    expect(resolveSurfacePoolSize({ SURFACE_POOL_SIZE: "12.9" } as unknown as NodeJS.ProcessEnv)).toBe(12);
  });

  it.each(["0", "-5", "abc", "", "  "])(
    "falls back to the default on invalid / non-positive value %p (never collapses the pool)",
    (value) => {
      expect(resolveSurfacePoolSize({ SURFACE_POOL_SIZE: value } as unknown as NodeJS.ProcessEnv)).toBe(22);
    },
  );
});
