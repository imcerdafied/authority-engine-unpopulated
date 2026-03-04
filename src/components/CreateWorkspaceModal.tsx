import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const labelClass =
  "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1";
const inputClass =
  "w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWorkspaceModal({
  open,
  onOpenChange,
}: CreateWorkspaceModalProps) {
  const { createOrg } = useOrg();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setName("");
    setRoleLabel("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !user) return;

    setLoading(true);
    try {
      const orgId = await createOrg(trimmedName);

      // Persist optional role label on the newly-created membership row
      const trimmedLabel = roleLabel.trim();
      if (trimmedLabel) {
        await supabase
          .from("organization_memberships")
          .update({ role_label: trimmedLabel } as any)
          .eq("org_id", orgId)
          .eq("user_id", user.id);
      }

      toast.success(`Workspace "${trimmedName}" created`);
      reset();
      onOpenChange(false);
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create workspace.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold tracking-widest uppercase">
            Create Workspace
          </DialogTitle>
          <DialogDescription>
            Set up a new workspace for your team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className={labelClass}>Workspace Name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="e.g. Identity Digital"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Your Role Label</label>
            <input
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              className={inputClass}
              placeholder="e.g. Consultant"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Optional — a descriptive title for your role in this workspace.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2.5 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Workspace"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
