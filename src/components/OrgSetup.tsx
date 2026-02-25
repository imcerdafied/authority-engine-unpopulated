import { useState } from "react";
import { useOrg, type ProductArea, type CustomCategory } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const SLOT_KEYS = ["S1", "S2", "S3", "S4", "S5"];

const DEFAULT_CATEGORIES: CustomCategory[] = [
  { key: "arr", label: "ARR" },
  { key: "renewal_retention", label: "Renewal & Retention" },
  { key: "strategic_positioning", label: "Strategic Positioning" },
  { key: "operational_efficiency", label: "Operational Efficiency" },
];

export default function OrgSetup() {
  const { createOrg } = useOrg();
  const { signOut, user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdOrgId, setCreatedOrgId] = useState<string | null>(null);

  // Step 1: Org name
  const [name, setName] = useState("");

  // Step 2: Product areas
  const [productAreas, setProductAreas] = useState<{ label: string }[]>([
    { label: "" },
    { label: "" },
    { label: "" },
  ]);

  // Step 3: Outcome categories
  const [useCustomCategories, setUseCustomCategories] = useState(false);
  const [categories, setCategories] = useState<{ label: string }[]>(
    DEFAULT_CATEGORIES.map((c) => ({ label: c.label })),
  );

  const inviteUrl = createdOrgId
    ? `https://buildauthorityos.com/join/${createdOrgId}`
    : "";

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const handleCreateOrg = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const areas: ProductArea[] = productAreas
      .filter((p) => p.label.trim())
      .map((p, i) => ({
        key: SLOT_KEYS[i],
        label: p.label.trim(),
      }));

    const customCats: CustomCategory[] | undefined = useCustomCategories
      ? categories
          .filter((c) => c.label.trim())
          .map((c) => ({
            key: c.label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
            label: c.label.trim(),
          }))
      : undefined;

    const orgId = await createOrg(
      name.trim(),
      areas.length > 0 ? areas : undefined,
      customCats,
    );
    setCreatedOrgId(orgId);
    setLoading(false);
    setStep(4);
  };

  const updateProductArea = (index: number, label: string) => {
    setProductAreas((prev) =>
      prev.map((p, i) => (i === index ? { label } : p)),
    );
  };

  const addProductArea = () => {
    if (productAreas.length < 5) {
      setProductAreas((prev) => [...prev, { label: "" }]);
    }
  };

  const removeProductArea = (index: number) => {
    if (productAreas.length > 1) {
      setProductAreas((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateCategory = (index: number, label: string) => {
    setCategories((prev) =>
      prev.map((c, i) => (i === index ? { label } : c)),
    );
  };

  const addCategory = () => {
    setCategories((prev) => [...prev, { label: "" }]);
  };

  const removeCategory = (index: number) => {
    if (categories.length > 1) {
      setCategories((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const [copied, setCopied] = useState(false);
  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filledAreas = productAreas.filter((p) => p.label.trim()).length;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
            Build Authority
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            {step === 1 && "Create Your Organization"}
            {step === 2 && "Define Product Areas"}
            {step === 3 && "Outcome Categories"}
            {step === 4 && "Invite Your Team"}
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1 rounded-full flex-1 transition-colors",
                s <= step ? "bg-foreground" : "bg-muted",
              )}
            />
          ))}
        </div>

        <div className="border rounded-md p-6">
          {/* Step 1: Org Name */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Create an organization to begin. You will be the Admin.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                    placeholder="Your Company"
                    onKeyDown={(e) => e.key === "Enter" && name.trim() && handleNext()}
                  />
                </div>
                <button
                  onClick={handleNext}
                  disabled={!name.trim()}
                  className="w-full text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 2: Product Areas */}
          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Define your product areas. These organize your strategic bets. You can add 1 to 5.
              </p>
              <div className="space-y-3">
                {productAreas.map((area, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground w-5 shrink-0">
                      {i + 1}.
                    </span>
                    <input
                      type="text"
                      value={area.label}
                      onChange={(e) => updateProductArea(i, e.target.value)}
                      className="flex-1 border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
                      placeholder={`Product area ${i + 1}`}
                    />
                    {productAreas.length > 1 && (
                      <button
                        onClick={() => removeProductArea(i)}
                        className="text-muted-foreground hover:text-signal-red text-sm p-1 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {productAreas.length < 5 && (
                  <button
                    onClick={addProductArea}
                    className="text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    + Add product area
                  </button>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBack}
                  className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-4 py-2.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={filledAreas === 0}
                  className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {/* Step 3: Outcome Categories */}
          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Outcome categories classify what each bet is driving toward. Use defaults or customize.
              </p>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setUseCustomCategories(false)}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors",
                    !useCustomCategories
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground text-foreground hover:bg-foreground hover:text-background",
                  )}
                >
                  Use Defaults
                </button>
                <button
                  onClick={() => setUseCustomCategories(true)}
                  className={cn(
                    "text-[11px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-sm border transition-colors",
                    useCustomCategories
                      ? "bg-foreground text-background border-foreground"
                      : "border-foreground text-foreground hover:bg-foreground hover:text-background",
                  )}
                >
                  Customize
                </button>
              </div>
              {useCustomCategories ? (
                <div className="space-y-3">
                  {categories.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cat.label}
                        onChange={(e) => updateCategory(i, e.target.value)}
                        className="flex-1 border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
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
              ) : (
                <div className="space-y-1">
                  {DEFAULT_CATEGORIES.map((c) => (
                    <p
                      key={c.key}
                      className="text-sm text-foreground/80 py-1 px-2 bg-muted/30 rounded"
                    >
                      {c.label}
                    </p>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    These can be changed later in settings.
                  </p>
                </div>
              )}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBack}
                  className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-4 py-2.5 rounded-sm hover:bg-foreground hover:text-background transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateOrg}
                  disabled={loading}
                  className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Organization"}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Invite Team */}
          {step === 4 && (
            <>
              <p className="text-sm text-foreground font-medium mb-1">
                {name} is ready!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Share this link with your team to invite them.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
                    Invite Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteUrl}
                      className="flex-1 border rounded-sm px-3 py-2 text-sm bg-muted text-foreground"
                    />
                    <button
                      onClick={copyInviteLink}
                      className="text-[11px] font-semibold uppercase tracking-wider text-foreground border border-foreground px-3 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors shrink-0"
                    >
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => window.location.replace("/")}
                  className="w-full text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          )}
        </div>

        {step < 4 && (
          <button
            onClick={signOut}
            className="mt-4 w-full text-[10px] text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors py-2"
          >
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
