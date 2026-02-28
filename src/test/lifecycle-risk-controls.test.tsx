import { fireEvent, render, screen } from "@testing-library/react";
import LifecycleRiskControls from "@/components/bets/LifecycleRiskControls";

describe("LifecycleRiskControls", () => {
  it("renders lifecycle select with expected copy", () => {
    render(
      <LifecycleRiskControls
        lifecycle="proving_value"
        canEdit={true}
        onLifecycleChange={() => {}}
      />,
    );

    expect(screen.getByLabelText("Lifecycle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Proving Value")).toBeInTheDocument();
  });

  it("emits lifecycle updates from edit controls", () => {
    const onLifecycleChange = vi.fn();

    render(
      <LifecycleRiskControls
        lifecycle="defined"
        canEdit={true}
        onLifecycleChange={onLifecycleChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Lifecycle"), { target: { value: "scaling" } });

    expect(onLifecycleChange).toHaveBeenCalledWith("scaling");
  });
});
