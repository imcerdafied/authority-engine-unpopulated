import { supabase } from "@/integrations/supabase/client";

export interface OutcomeCategoryItem {
  key: string;
  label: string;
}

export async function fetchOutcomeCategories(): Promise<OutcomeCategoryItem[]> {
  const { data, error } = await supabase
    .from("outcome_categories" as any)
    .select("key, label")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OutcomeCategoryItem[];
}
