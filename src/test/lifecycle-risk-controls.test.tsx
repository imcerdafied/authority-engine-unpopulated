import { fireEvent, render, screen } from "@testing-library/react";
import LifecycleRiskControls from "@/components/bets/LifecycleRiskControls";

describe("LifecycleRiskControls", () => {
  it("renders lifecycle and risk badges with expected copy", () => {
    render(
      <LifecycleRiskControls
        lifecycle="proving_value"
        riskLevel="watch"
        canEdit={true}
        onLifecycleChange={() => {}}
        onRiskLevelChange={() => {}}
      />,
    );

    expect(screen.getAllByText("Proving Value").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Watch").length).toBeGreaterThan(0);
  });

  it("emits lifecycle and risk updates from edit controls", () => {
    const onLifecycleChange = vi.fn();
    const onRiskLevelChange = vi.fn();

    render(
      <LifecycleRiskControls
        lifecycle="defined"
        riskLevel="healthy"
        canEdit={true}
        onLifecycleChange={onLifecycleChange}
        onRiskLevelChange={onRiskLevelChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Lifecycle"), { target: { value: "scaling" } });
    fireEvent.change(screen.getByLabelText("Risk"), { target: { value: "at_risk" } });

    expect(onLifecycleChange).toHaveBeenCalledWith("scaling");
    expect(onRiskLevelChange).toHaveBeenCalledWith("at_risk");
  });
});
