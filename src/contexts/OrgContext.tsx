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
  createOrg: (name: string, productAreas?: ProductArea[], customOutcomeCategories?: CustomCategory[]) => Promise<string>;
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
  createOrg: async () => {
    throw new Error("Not implemented");
  },
  updateOrg: async () => {},
  refetchMemberships: async () => {},
});

const ORG_STORAGE_KEY = "ba_current_org";
const PENDING_ORG_JOIN_KEY = "pending_org_join";
const PENDING_JOIN_TTL_MS = 1000 * 60 * 30;

function readPendingOrgJoin(): string | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PENDING_ORG_JOIN_KEY);
  if (!raw) return null;

  // Legacy value support (plain org id string)
  if (!raw.startsWith("{")) return raw;

  try {
    const parsed = JSON.parse(raw) as { orgId?: string; createdAt?: number; expiresAt?: number };
    if (!parsed?.orgId) return null;
    const expiry = parsed.expiresAt ?? ((parsed.createdAt ?? 0) + PENDING_JOIN_TTL_MS);
    if (expiry && Date.now() > expiry) {
      localStorage.removeItem(PENDING_ORG_JOIN_KEY);
      return null;
    }
    return parsed.orgId;
  } catch {
    localStorage.removeItem(PENDING_ORG_JOIN_KEY);
    return null;
  }
}

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
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/join/")) {
      return;
    }

    const pendingOrgId = readPendingOrgJoin();
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
  ): Promise<string> => {
    if (!user) throw new Error("Please sign in again.");
    const payload = {
      name,
      productAreas: productAreas?.length ? productAreas : undefined,
      customOutcomeCategories: customOutcomeCategories?.length ? customOutcomeCategories : undefined,
    };

    // Path 1: standard edge invoke
    const { data, error } = await supabase.functions.invoke("create-org", { body: payload });
    if (!error && data?.orgId) {
      await fetchMemberships();
      handleSetCurrentOrgId(data.orgId);
      return data.orgId;
    }
    let lastError = error?.message ? String(error.message) : "Edge create-org failed.";

    // Path 2: direct HTTP edge call (handles transport/non-2xx inconsistencies)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      if (accessToken && supabaseUrl && supabaseAnonKey) {
        const res = await fetch(`${supabaseUrl}/functions/v1/create-org`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok && body?.orgId) {
          await fetchMemberships();
          handleSetCurrentOrgId(body.orgId);
          return body.orgId;
        }
        lastError = String(body?.error || `create-org HTTP ${res.status}`);
      }
    } catch (fallbackErr) {
      lastError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error("Fallback create-org HTTP failed:", fallbackErr);
    }

    // Path 3: final local fallback - create directly, then membership.
    // This keeps onboarding unblocked if edge routing is flaky.
    const { data: existingMembershipOrgs } = await supabase
      .from("organization_memberships")
      .select("org_id, organizations(id,name)")
      .eq("user_id", user.id);
    const existingByName = (existingMembershipOrgs || []).find((row: any) => {
      const orgName = String(row?.organizations?.name || "").trim().toLowerCase();
      return orgName === name.trim().toLowerCase();
    });
    if (existingByName?.org_id) {
      await fetchMemberships();
      handleSetCurrentOrgId(existingByName.org_id);
      return existingByName.org_id;
    }

    const insertData: any = {
      name,
      created_by: user.id,
      allowed_email_domain: null,
    };

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert(insertData)
      .select("id")
      .single();
    if (orgError || !org?.id) {
      console.error("Failed to create org (all paths):", error, orgError);
      throw new Error(orgError?.message || lastError || "Organization insert failed.");
    }

    const { error: memError } = await supabase
      .from("organization_memberships")
      .insert({ user_id: user.id, org_id: org.id, role: "admin" as AppRole });
    if (memError) {
      console.error("Failed to create membership after org insert:", memError);
      throw new Error(memError.message || "Failed to create admin membership.");
    }

    const optionalUpdate: any = {};
    if (productAreas?.length) optionalUpdate.product_areas = productAreas;
    if (customOutcomeCategories?.length) optionalUpdate.custom_outcome_categories = customOutcomeCategories;
    if (Object.keys(optionalUpdate).length > 0) {
      const { error: optionalErr } = await supabase
        .from("organizations")
        .update(optionalUpdate)
        .eq("id", org.id);
      if (optionalErr) {
        console.warn("Optional org metadata update skipped:", optionalErr.message);
      }
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
