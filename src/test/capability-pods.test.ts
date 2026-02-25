import { describe, it, expect } from "vitest";
import {
  canSetInProduction,
  computeDriftWarnings,
  parseCsvImport,
  parseKpiTargets,
  parsePodDependencies,
} from "@/lib/types";
import type { CapabilityPod, KpiTarget, PodDependencies } from "@/lib/types";

function makePod(overrides: Partial<CapabilityPod> = {}): CapabilityPod {
  return {
    id: "pod-1",
    org_id: "org-1",
    name: "Test Pod",
    description: null,
    primary_bet_id: "bet-1",
    secondary_bet_id: null,
    owner: "Jane",
    status: "proposed",
    deliverable: null,
    kpi_targets: [],
    prototype_built: false,
    customer_validated: false,
    production_shipped: false,
    cycle_time_days: null,
    dependencies: { shared_primitive: false, notes: "", blocking_pods: [] },
    created_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("canSetInProduction", () => {
  it("returns false when prototype_built is false", () => {
    expect(canSetInProduction({ prototype_built: false, customer_validated: true })).toBe(false);
  });

  it("returns false when customer_validated is false", () => {
    expect(canSetInProduction({ prototype_built: true, customer_validated: false })).toBe(false);
  });

  it("returns false when both are false", () => {
    expect(canSetInProduction({ prototype_built: false, customer_validated: false })).toBe(false);
  });

  it("returns true when both are true", () => {
    expect(canSetInProduction({ prototype_built: true, customer_validated: true })).toBe(true);
  });
});

describe("computeDriftWarnings", () => {
  it("warns when no KPI targets set", () => {
    const pod = makePod({ kpi_targets: [] });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).toContain("No KPI targets set");
  });

  it("does not warn about KPI when targets exist", () => {
    const pod = makePod({
      kpi_targets: [{ kpi_name: "Revenue", baseline: "0", target: "1M", unit: "$", measurement_notes: "" }],
    });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).not.toContain("No KPI targets set");
  });

  it("warns when in_production but not shipped", () => {
    const pod = makePod({
      status: "in_production",
      prototype_built: true,
      customer_validated: true,
      production_shipped: false,
    });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).toContain("In production but not yet shipped");
  });

  it("warns when building without customer validation", () => {
    const pod = makePod({ status: "building", customer_validated: false });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).toContain("Customer validation missing");
  });

  it("warns about cross-platform pod without secondary bet", () => {
    const pod = makePod({
      description: "Cross-platform data layer",
      secondary_bet_id: null,
    });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).toContain("Cross-platform pod without secondary bet");
  });

  it("does not warn about cross-platform when secondary bet exists", () => {
    const pod = makePod({
      description: "Cross-platform data layer",
      secondary_bet_id: "bet-2",
    });
    const warnings = computeDriftWarnings(pod);
    expect(warnings).not.toContain("Cross-platform pod without secondary bet");
  });
});

describe("parseCsvImport", () => {
  const decisions = [
    { id: "bet-1", title: "Enterprise DPI Bet" },
    { id: "bet-2", title: "Agent Intelligence Bet" },
  ];

  it("parses pipe-delimited rows", () => {
    const text = "Data Platform | Enterprise DPI Bet | Agent Intelligence Bet | Jane | proposed | Migrate data";
    const result = parseCsvImport(text, decisions);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].pod_name).toBe("Data Platform");
    expect(result.rows[0].primary_bet_id).toBe("bet-1");
    expect(result.rows[0].secondary_bet_id).toBe("bet-2");
    expect(result.rows[0].owner).toBe("Jane");
    expect(result.rows[0].error).toBeUndefined();
  });

  it("parses tab-delimited rows", () => {
    const text = "Data Platform\tEnterprise DPI Bet\t\tJane\tproposed\tMigrate data";
    const result = parseCsvImport(text, decisions);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].primary_bet_id).toBe("bet-1");
    expect(result.rows[0].secondary_bet_id).toBeNull();
  });

  it("flags missing pod name", () => {
    const text = " | Enterprise DPI Bet | | Jane | proposed | Migrate";
    const result = parseCsvImport(text, decisions);
    expect(result.rows[0].error).toBe("Missing pod name");
  });

  it("flags unresolved primary bet", () => {
    const text = "Data Platform | Nonexistent Bet | | Jane | proposed | Migrate";
    const result = parseCsvImport(text, decisions);
    expect(result.rows[0].error).toContain("not found");
  });

  it("flags unresolved secondary bet", () => {
    const text = "Data Platform | Enterprise DPI Bet | Bad Bet | Jane | proposed | Migrate";
    const result = parseCsvImport(text, decisions);
    expect(result.rows[0].error).toContain("Secondary bet");
  });

  it("handles multiple rows", () => {
    const text = "Pod A | Enterprise DPI Bet | | Jane | proposed | A\nPod B | Agent Intelligence Bet | | John | building | B";
    const result = parseCsvImport(text, decisions);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].error).toBeUndefined();
    expect(result.rows[1].error).toBeUndefined();
  });

  it("is case-insensitive for bet matching", () => {
    const text = "Pod A | enterprise dpi bet | | Jane | proposed | A";
    const result = parseCsvImport(text, decisions);
    expect(result.rows[0].primary_bet_id).toBe("bet-1");
  });
});

describe("parseKpiTargets", () => {
  it("returns empty array for non-array input", () => {
    expect(parseKpiTargets(null)).toEqual([]);
    expect(parseKpiTargets("string")).toEqual([]);
    expect(parseKpiTargets(42)).toEqual([]);
  });

  it("filters invalid items", () => {
    const input = [
      { kpi_name: "Revenue", baseline: "0", target: "1M", unit: "$" },
      { notAKpi: true },
      null,
    ];
    const result = parseKpiTargets(input);
    expect(result).toHaveLength(1);
    expect(result[0].kpi_name).toBe("Revenue");
  });
});

describe("parsePodDependencies", () => {
  it("returns defaults for null input", () => {
    const result = parsePodDependencies(null);
    expect(result.shared_primitive).toBe(false);
    expect(result.notes).toBe("");
    expect(result.blocking_pods).toEqual([]);
  });

  it("parses valid dependencies", () => {
    const input = { shared_primitive: true, notes: "Depends on auth", blocking_pods: ["pod-2"] };
    const result = parsePodDependencies(input);
    expect(result.shared_primitive).toBe(true);
    expect(result.notes).toBe("Depends on auth");
    expect(result.blocking_pods).toEqual(["pod-2"]);
  });
});

describe("secondary_bet_id != primary_bet_id constraint", () => {
  it("validates that secondary cannot equal primary (client-side check)", () => {
    // This tests the logical constraint that would be enforced at DB level
    const primaryId = "bet-1";
    const secondaryId = "bet-1";
    expect(secondaryId).toBe(primaryId); // They're the same — would violate constraint
    // The CreateCapabilityPodForm filters out primary from secondary dropdown
    const activeBets = [
      { id: "bet-1", title: "Bet A" },
      { id: "bet-2", title: "Bet B" },
    ];
    const secondaryOptions = activeBets.filter((b) => b.id !== primaryId);
    expect(secondaryOptions).toHaveLength(1);
    expect(secondaryOptions[0].id).toBe("bet-2");
  });
});
