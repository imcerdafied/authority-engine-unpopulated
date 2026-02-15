import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";

export default function OrgSetup() {
  const { createOrg } = useOrg();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    await createOrg(name.trim());
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-foreground">
            Build Authority
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Create Your Organization
          </p>
        </div>

        <div className="border rounded-md p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Create an organization to begin. You will be the Admin.
          </p>
          <form onSubmit={handleCreate} className="space-y-4">
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
                placeholder="Conviva"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Organization"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
