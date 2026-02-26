import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface ProductArea {
  key: string;
  label: string;
}

export interface CustomCategory {
  key: string;
  label: string;
}

const DEFAULT_PRODUCT_AREAS: ProductArea[] = [
  { key: "S1", label: "Area 1" },
  { key: "S2", label: "Area 2" },
  { key: "S3", label: "Area 3" },
];

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
  productAreas: ProductArea[];
  customOutcomeCategories: CustomCategory[] | null;
  setCurrentOrgId: (orgId: string) => void;
  createOrg: (name: string, productAreas?: ProductArea[], customOutcomeCategories?: CustomCategory[]) => Promise<string | null>;
  updateOrg: (fields: { product_areas?: ProductArea[]; custom_outcome_categories?: CustomCategory[] }) => Promise<void>;
  refetchMemberships: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType>({
  currentOrg: null,
  currentRole: null,
  memberships: [],
  loading: true,
  productAreas: DEFAULT_PRODUCT_AREAS,
  customOutcomeCategories: null,
  setCurrentOrgId: () => {},
  createOrg: async () => null,
  updateOrg: async () => {},
  refetchMemberships: async () => {},
});

const ORG_STORAGE_KEY = "ba_current_org";
const PENDING_ORG_JOIN_KEY = "pending_org_join";

function parseProductAreas(raw: unknown): ProductArea[] {
  if (!raw || !Array.isArray(raw)) return DEFAULT_PRODUCT_AREAS;
  const parsed = raw.filter(
    (item: any) => item && typeof item.key === "string" && typeof item.label === "string",
  ) as ProductArea[];
  return parsed.length > 0 ? parsed : DEFAULT_PRODUCT_AREAS;
}

function parseCustomCategories(raw: unknown): CustomCategory[] | null {
  if (!raw || !Array.isArray(raw)) return null;
  const parsed = raw.filter(
    (item: any) => item && typeof item.key === "string" && typeof item.label === "string",
  ) as CustomCategory[];
  return parsed.length > 0 ? parsed : null;
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(
    localStorage.getItem(ORG_STORAGE_KEY),
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

  const createOrg = async (
    name: string,
    productAreas?: ProductArea[],
    customOutcomeCategories?: CustomCategory[],
  ): Promise<string | null> => {
    if (!user) return null;
    const allowedEmailDomain = null;

    const insertData: any = {
      name,
      created_by: user.id,
      allowed_email_domain: allowedEmailDomain,
    };
    if (productAreas?.length) insertData.product_areas = productAreas;
    if (customOutcomeCategories?.length) insertData.custom_outcome_categories = customOutcomeCategories;

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert(insertData)
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

  const updateOrg = async (fields: { product_areas?: ProductArea[]; custom_outcome_categories?: CustomCategory[] }) => {
    if (!currentOrgId) return;
    const { error } = await supabase
      .from("organizations")
      .update(fields as any)
      .eq("id", currentOrgId);
    if (error) {
      console.error("Failed to update org:", error);
      throw error;
    }
    await fetchMemberships();
  };

  const currentMembership = memberships.find((m) => m.org_id === currentOrgId);
  const currentOrg = currentMembership?.organization ?? null;

  const productAreas = useMemo(
    () => parseProductAreas((currentOrg as any)?.product_areas),
    [currentOrg],
  );

  const customOutcomeCategories = useMemo(
    () => parseCustomCategories((currentOrg as any)?.custom_outcome_categories),
    [currentOrg],
  );

  return (
    <OrgContext.Provider
      value={{
        currentOrg,
        currentRole: currentMembership?.role ?? null,
        memberships,
        loading,
        productAreas,
        customOutcomeCategories,
        setCurrentOrgId: handleSetCurrentOrgId,
        createOrg,
        updateOrg,
        refetchMemberships: fetchMemberships,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
