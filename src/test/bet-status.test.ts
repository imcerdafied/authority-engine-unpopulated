import {
  formatBetLifecycleStatus,
  formatBetRiskLevel,
  mapLegacyBetStatus,
  toBetLifecycleStatus,
  toBetRiskLevel,
} from "@/lib/bet-status";

describe("mapLegacyBetStatus", () => {
  it("maps legacy lifecycle values to universal lifecycle", () => {
    expect(mapLegacyBetStatus("Hypothesis Defined")).toEqual({ status: "defined", riskLevel: "healthy" });
    expect(mapLegacyBetStatus("Piloting")).toEqual({ status: "proving_value", riskLevel: "healthy" });
    expect(mapLegacyBetStatus("Scaling")).toEqual({ status: "scaling", riskLevel: "healthy" });
    expect(mapLegacyBetStatus("Closed")).toEqual({ status: "closed", riskLevel: "healthy" });
  });

  it("maps at risk into risk_level instead of lifecycle", () => {
    expect(mapLegacyBetStatus("At risk")).toEqual({ status: "proving_value", riskLevel: "at_risk" });
    expect(mapLegacyBetStatus("blocked")).toEqual({ status: "proving_value", riskLevel: "at_risk" });
  });

  it("uses a safe fallback for unexpected status strings", () => {
    expect(mapLegacyBetStatus("something-new")).toEqual({ status: "defined", riskLevel: "watch" });
  });
});

describe("format helpers", () => {
  it("formats status and risk labels with consistent copy", () => {
    expect(formatBetLifecycleStatus("proving_value")).toBe("Proving Value");
    expect(formatBetRiskLevel("at_risk")).toBe("At Risk");
  });

  it("normalizes unknown values", () => {
    expect(toBetLifecycleStatus("unknown")).toBe("defined");
    expect(toBetRiskLevel("unknown")).toBe("healthy");
  });
});
