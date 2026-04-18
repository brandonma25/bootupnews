import { describe, expect, it } from "vitest";

import { getActiveDonorMappings, getDonorSubsystemMappings } from "@/lib/integration/donor-mapping";
import { getPipelineIntegrationSnapshot, getStageOwnership } from "@/lib/integration/pipeline-config";

describe("donor subsystem mapping", () => {
  it("exposes donor-to-subsystem ownership without leaking donor contracts into the UI layer", () => {
    const mappings = getDonorSubsystemMappings();

    expect(mappings.some((entry) => entry.donor === "openclaw" && entry.subsystem === "ingestion" && entry.state === "active")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "after_market_agent" && entry.subsystem === "clustering" && entry.state === "active")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "after_market_agent" && entry.subsystem === "connection" && entry.state === "active")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "fns" && entry.subsystem === "ranking" && entry.state === "active")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "fns" && entry.subsystem === "clustering" && entry.state === "stubbed")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "horizon" && entry.subsystem === "enrichment" && entry.state === "active")).toBe(true);
    expect(mappings.some((entry) => entry.donor === "horizon" && entry.subsystem === "connection" && entry.state === "future_ready")).toBe(true);
  });

  it("marks pipeline stages as canonical or donor-assisted explicitly", () => {
    const snapshot = getPipelineIntegrationSnapshot();

    expect(snapshot.active_donors).toEqual(["openclaw", "after_market_agent", "fns", "horizon"]);
    expect(getStageOwnership("ingestion")).toBe("donor_assisted");
    expect(getStageOwnership("normalization")).toBe("canonical");
    expect(getStageOwnership("clustering")).toBe("donor_assisted");
    expect(getStageOwnership("ranking")).toBe("donor_assisted");
    expect(getStageOwnership("connection")).toBe("donor_assisted");
    expect(getActiveDonorMappings().length).toBeGreaterThanOrEqual(3);
  });
});
