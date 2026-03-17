import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export default function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const navigate = useNavigate();
  const { createOrg, refetchMemberships } = useOrg();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [roleLabel, setRoleLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setRoleLabel("");
      setSubmitting(false);
    }
  }, [open]);

  const handleCreate = async () => {
    const workspaceName = name.trim();
    const myRoleLabel = roleLabel.trim();
    if (!workspaceName) {
      toast.error("Workspace name is required.");
      return;
    }
    if (!user?.id) {
      toast.error("Please sign in again.");
      return;
    }

    setSubmitting(true);
    try {
      const orgId = await createOrg(workspaceName);
      if (myRoleLabel) {
        const { error } = await supabase
          .from("organization_memberships")
          .update({ role_label: myRoleLabel } as any)
          .eq("org_id", orgId)
          .eq("user_id", user.id);
        if (error) {
          if (error.message.includes("role_label")) {
            throw new Error("`role_label` migration is not applied in Supabase yet.");
          }
          throw error;
        }
        await refetchMemberships();
      }

      toast.success("Workspace created.");
      onOpenChange(false);
      navigate("/", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create workspace.";
      toast.error("Workspace creation failed.", { description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base uppercase tracking-wider">Create Workspace</DialogTitle>
          <DialogDescription>
            Create an isolated client workspace. You will be added as admin for this workspace only.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Conviva"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !submitting) {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Your Role Label (Optional)
            </label>
            <input
              type="text"
              value={roleLabel}
              onChange={(e) => setRoleLabel(e.target.value)}
              placeholder="Consultant"
              className="w-full border rounded-sm px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-[11px] font-semibold uppercase tracking-wider border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={submitting || !name.trim()}
            className="text-[11px] font-semibold uppercase tracking-wider text-background bg-foreground px-4 py-2 rounded-sm hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Workspace"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
