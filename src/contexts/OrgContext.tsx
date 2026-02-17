import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface OrgMembership {
  org_id: string;
  role: AppRole;
  organization: Tables<"organizations">;
}

interface OrgContextType {
  currentOrg: Tables<"organizations"> | null;
  currentRole: AppRole | null;
  memberships: OrgMembership[];
  loading: boolean;
  setCurrentOrgId: (orgId: string) => void;
  createOrg: (name: string) => Promise<string | null>;
  refetchMemberships: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  currentRole: null,
  memberships: [],
  loading: true,
  setCurrentOrgId: () => {},
  createOrg: async () => null,
  refetchMemberships: async () => {},
});

const ORG_STORAGE_KEY = "ba_current_org";
const PENDING_ORG_JOIN_KEY = "pending_org_join";

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    localStorage.getItem(ORG_STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);

  const fetchMemberships = useCallback(async () => {
    if (!user) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("organization_memberships")
      .select("org_id, role, organizations(*)")
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to fetch memberships:", error);
      setLoading(false);
      return;
    }

    const mapped: OrgMembership[] = (data || []).map((m: any) => ({
      org_id: m.org_id,
      role: m.role,
      organization: m.organizations,
    }));

    setMemberships(mapped);

    // Auto-select org
    if (mapped.length > 0) {
      const stored = localStorage.getItem(ORG_STORAGE_KEY);
      const validStored = mapped.find((m) => m.org_id === stored);
      if (!validStored) {
        setCurrentOrgId(mapped[0].org_id);
        localStorage.setItem(ORG_STORAGE_KEY, mapped[0].org_id);
      }
    } else {
      setCurrentOrgId(null);
      localStorage.removeItem(ORG_STORAGE_KEY);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    const pendingOrgId = localStorage.getItem(PENDING_ORG_JOIN_KEY);
    if (!user || !pendingOrgId) return;

    const processPendingJoin = async () => {
      try {
        const { error } = await supabase.functions.invoke("join-org", {
          body: { orgId: pendingOrgId },
        });
        if (!error) {
          localStorage.removeItem(PENDING_ORG_JOIN_KEY);
          await fetchMemberships();
          setCurrentOrgId(pendingOrgId);
          localStorage.setItem(ORG_STORAGE_KEY, pendingOrgId);
        }
      } catch {
        // leave key for retry
      }
    };

    processPendingJoin();
  }, [user, fetchMemberships]);

  const handleSetCurrentOrgId = (orgId: string) => {
    setCurrentOrgId(orgId);
    localStorage.setItem(ORG_STORAGE_KEY, orgId);
  };

  const createOrg = async (name: string): Promise<string | null> => {
    if (!user) return null;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (orgError || !org) {
      console.error("Failed to create org:", orgError);
      return null;
    }

    // Add creator as admin
    const { error: memError } = await supabase
      .from("organization_memberships")
      .insert({ user_id: user.id, org_id: org.id, role: "admin" as AppRole });

    if (memError) {
      console.error("Failed to add membership:", memError);
      return null;
    }

    await fetchMemberships();
    handleSetCurrentOrgId(org.id);
    return org.id;
  };

  const currentMembership = memberships.find((m) => m.org_id === currentOrgId);

  return (
    <OrgContext.Provider
      value={{
        currentOrg: currentMembership?.organization ?? null,
        currentRole: currentMembership?.role ?? null,
        memberships,
        loading,
        setCurrentOrgId: handleSetCurrentOrgId,
        createOrg,
        refetchMemberships: fetchMemberships,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
