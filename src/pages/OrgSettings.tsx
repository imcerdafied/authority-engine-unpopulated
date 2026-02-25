import { useState, useEffect } from "react";
import { useOrg, type ProductArea, type CustomCategory } from "@/contexts/OrgContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const SLOT_KEYS = ["S1", "S2", "S3", "S4", "S5"];

export default function OrgSettings() {
  const { currentOrg, currentRole, productAreas: orgAreas, customOutcomeCategories: orgCategories, updateOrg } = useOrg();

  const [areas, setAreas] = useState<{ label: string }[]>([]);
  const [categories, setCategories] = useState<{ label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync from org context on load
  useEffect(() => {
    setAreas(orgAreas.map((a) => ({ label: a.label })));
  }, [orgAreas]);

  useEffect(() => {
    if (orgCategories) {
      setCategories(orgCategories.map((c) => ({ label: c.label })));
    }
  }, [orgCategories]);

  if (currentRole !== "admin") {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">Only admins can access organization settings.</p>
      </div>
    );
  }

  const updateArea = (index: number, label: string) => {
    setAreas((prev) => prev.map((a, i) => (i === index ? { label } : a)));
  };

  const addArea = () => {
    if (areas.length < 5) setAreas((prev) => [...prev, { label: "" }]);
  };

  const removeArea = (index: number) => {
    if (areas.length > 1) setAreas((prev) => prev.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, label: string) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? { label } : c)));
  };

  const addCategory = () => {
    setCategories((prev) => [...prev, { label: "" }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const filledAreas = areas.filter((a) => a.label.trim());
    if (filledAreas.length === 0) {
      toast.error("At least one product area is required.");
      return;
    }

    setSaving(true);
    try {
      const productAreas: ProductArea[] = filledAreas.map((a, i) => ({
        key: SLOT_KEYS[i],
        label: a.label.trim(),
      }));

      const filledCategories = categories.filter((c) => c.label.trim());
      const customOutcomeCategories: CustomCategory[] | undefined =
        filledCategories.length > 0
          ? filledCategories.map((c) => ({
              key: c.label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
              label: c.label.trim(),
            }))
          : undefined;

      await updateOrg({
        product_areas: productAreas,
        ...(customOutcomeCategories ? { custom_outcome_categories: customOutcomeCategories } : {}),
      });

      toast.success("Settings saved.");
    } catch {
      toast.error("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "flex-1 border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg font-bold">Settings</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {currentOrg?.name ?? "Organization"} configuration
        </p>
      </div>

      <div className="space-y-8 max-w-lg">
        {/* Product Areas */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Product Areas
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            These organize your strategic bets into domains. 1 to 5 areas.
          </p>
          <div className="space-y-2">
            {areas.map((area, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-5 shrink-0">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={area.label}
                  onChange={(e) => updateArea(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Product area ${i + 1}`}
                />
                {areas.length > 1 && (
                  <button
                    onClick={() => removeArea(i)}
                    className="text-muted-foreground hover:text-signal-red text-sm p-1 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {areas.length < 5 && (
              <button
                onClick={addArea}
                className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                + Add product area
              </button>
            )}
          </div>
        </section>

        {/* Outcome Categories */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Outcome Categories
          </h2>
          <p className="text-sm text-muted-foreground mb-3">
            Classify what each bet is driving toward.
          </p>
          <div className="space-y-2">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={cat.label}
                  onChange={(e) => updateCategory(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Category ${i + 1}`}
                />
                {categories.length > 1 && (
                  <button
                    onClick={() => removeCategory(i)}
                    className="text-muted-foreground hover:text-signal-red text-sm p-1 shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addCategory}
              className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              + Add category
            </button>
          </div>
        </section>

        {/* Save */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider px-4 py-2.5 rounded-sm transition-colors",
              "bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50",
            )}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
