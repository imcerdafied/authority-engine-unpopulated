export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      closed_decisions: {
        Row: {
          actual_result: string
          agent_impact: string | null
          closed_date: string
          created_at: string
          created_by: string | null
          decision_id: string | null
          expected_outcome: string
          id: string
          notes: string
          org_id: string
          prediction_accuracy: Database["public"]["Enums"]["prediction_accuracy"]
          renewal_impact: string | null
          segment_shift: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          title: string
        }
        Insert: {
          actual_result: string
          agent_impact?: string | null
          closed_date: string
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          expected_outcome: string
          id?: string
          notes?: string
          org_id: string
          prediction_accuracy?: Database["public"]["Enums"]["prediction_accuracy"]
          renewal_impact?: string | null
          segment_shift?: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          title: string
        }
        Update: {
          actual_result?: string
          agent_impact?: string | null
          closed_date?: string
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          expected_outcome?: string
          id?: string
          notes?: string
          org_id?: string
          prediction_accuracy?: Database["public"]["Enums"]["prediction_accuracy"]
          renewal_impact?: string | null
          segment_shift?: string | null
          solution_domain?: Database["public"]["Enums"]["solution_domain"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "closed_decisions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_decisions_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "closed_decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      decisions: {
        Row: {
          blocked_dependency_owner: string | null
          blocked_reason: string | null
          created_at: string
          created_by: string | null
          current_delta: string | null
          decision_health: Database["public"]["Enums"]["decision_health"] | null
          executive_attention_required: boolean
          expected_impact: string | null
          id: string
          impact_tier: Database["public"]["Enums"]["impact_tier"]
          measured_outcome_result: string | null
          org_id: string
          outcome_category:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target: string | null
          owner: string
          revenue_at_risk: string | null
          segment_impact: string | null
          shipped_slice_date: string | null
          slice_deadline_days: number | null
          slice_due_at: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          status: Database["public"]["Enums"]["decision_status"]
          surface: string
          title: string
          trigger_signal: string | null
          updated_at: string
        }
        Insert: {
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          created_at?: string
          created_by?: string | null
          current_delta?: string | null
          decision_health?:
            | Database["public"]["Enums"]["decision_health"]
            | null
          executive_attention_required?: boolean
          expected_impact?: string | null
          id?: string
          impact_tier?: Database["public"]["Enums"]["impact_tier"]
          measured_outcome_result?: string | null
          org_id: string
          outcome_category?:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target?: string | null
          owner: string
          revenue_at_risk?: string | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          solution_domain: Database["public"]["Enums"]["solution_domain"]
          status?: Database["public"]["Enums"]["decision_status"]
          surface: string
          title: string
          trigger_signal?: string | null
          updated_at?: string
        }
        Update: {
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          created_at?: string
          created_by?: string | null
          current_delta?: string | null
          decision_health?:
            | Database["public"]["Enums"]["decision_health"]
            | null
          executive_attention_required?: boolean
          expected_impact?: string | null
          id?: string
          impact_tier?: Database["public"]["Enums"]["impact_tier"]
          measured_outcome_result?: string | null
          org_id?: string
          outcome_category?:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target?: string | null
          owner?: string
          revenue_at_risk?: string | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          solution_domain?: Database["public"]["Enums"]["solution_domain"]
          status?: Database["public"]["Enums"]["decision_status"]
          surface?: string
          title?: string
          trigger_signal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      pod_initiatives: {
        Row: {
          created_at: string
          cross_solution_dep: string | null
          id: string
          last_demo_date: string | null
          name: string
          outcome_linked: boolean
          owner: string
          pod_id: string
          renewal_aligned: boolean | null
          shipped: boolean
          slice_deadline: string
        }
        Insert: {
          created_at?: string
          cross_solution_dep?: string | null
          id?: string
          last_demo_date?: string | null
          name: string
          outcome_linked?: boolean
          owner: string
          pod_id: string
          renewal_aligned?: boolean | null
          shipped?: boolean
          slice_deadline: string
        }
        Update: {
          created_at?: string
          cross_solution_dep?: string | null
          id?: string
          last_demo_date?: string | null
          name?: string
          outcome_linked?: boolean
          owner?: string
          pod_id?: string
          renewal_aligned?: boolean | null
          shipped?: boolean
          slice_deadline?: string
        }
        Relationships: [
          {
            foreignKeyName: "pod_initiatives_pod_id_fkey"
            columns: ["pod_id"]
            isOneToOne: false
            referencedRelation: "pods"
            referencedColumns: ["id"]
          },
        ]
      }
      pods: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          org_id: string
          owner: string
          solution_domain: Database["public"]["Enums"]["solution_domain"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          org_id: string
          owner: string
          solution_domain: Database["public"]["Enums"]["solution_domain"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          org_id?: string
          owner?: string
          solution_domain?: Database["public"]["Enums"]["solution_domain"]
        }
        Relationships: [
          {
            foreignKeyName: "pods_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          created_at: string
          created_by: string | null
          decision_id: string | null
          description: string
          id: string
          org_id: string
          solution_domain: Database["public"]["Enums"]["solution_domain"] | null
          source: string
          type: Database["public"]["Enums"]["signal_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          description: string
          id?: string
          org_id: string
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          source: string
          type: Database["public"]["Enums"]["signal_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision_id?: string | null
          description?: string
          id?: string
          org_id?: string
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          source?: string
          type?: Database["public"]["Enums"]["signal_type"]
        }
        Relationships: [
          {
            foreignKeyName: "signals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_decision_id_fkey"
            columns: ["decision_id"]
            isOneToOne: false
            referencedRelation: "decisions_computed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      decisions_computed: {
        Row: {
          age_days: number | null
          blocked_dependency_owner: string | null
          blocked_reason: string | null
          created_at: string | null
          created_by: string | null
          current_delta: string | null
          decision_health: Database["public"]["Enums"]["decision_health"] | null
          executive_attention_required: boolean | null
          expected_impact: string | null
          id: string | null
          impact_tier: Database["public"]["Enums"]["impact_tier"] | null
          is_aging: boolean | null
          is_exceeded: boolean | null
          is_unbound: boolean | null
          is_urgent: boolean | null
          measured_outcome_result: string | null
          org_id: string | null
          outcome_category:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target: string | null
          owner: string | null
          revenue_at_risk: string | null
          segment_impact: string | null
          shipped_slice_date: string | null
          slice_deadline_days: number | null
          slice_due_at: string | null
          slice_remaining: number | null
          solution_domain: Database["public"]["Enums"]["solution_domain"] | null
          status: Database["public"]["Enums"]["decision_status"] | null
          surface: string | null
          title: string | null
          trigger_signal: string | null
          updated_at: string | null
        }
        Insert: {
          age_days?: never
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?:
            | Database["public"]["Enums"]["decision_health"]
            | null
          executive_attention_required?: boolean | null
          expected_impact?: string | null
          id?: string | null
          impact_tier?: Database["public"]["Enums"]["impact_tier"] | null
          is_aging?: never
          is_exceeded?: never
          is_unbound?: never
          is_urgent?: never
          measured_outcome_result?: string | null
          org_id?: string | null
          outcome_category?:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target?: string | null
          owner?: string | null
          revenue_at_risk?: string | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          slice_remaining?: never
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface?: string | null
          title?: string | null
          trigger_signal?: string | null
          updated_at?: string | null
        }
        Update: {
          age_days?: never
          blocked_dependency_owner?: string | null
          blocked_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          current_delta?: string | null
          decision_health?:
            | Database["public"]["Enums"]["decision_health"]
            | null
          executive_attention_required?: boolean | null
          expected_impact?: string | null
          id?: string | null
          impact_tier?: Database["public"]["Enums"]["impact_tier"] | null
          is_aging?: never
          is_exceeded?: never
          is_unbound?: never
          is_urgent?: never
          measured_outcome_result?: string | null
          org_id?: string | null
          outcome_category?:
            | Database["public"]["Enums"]["outcome_category"]
            | null
          outcome_target?: string | null
          owner?: string | null
          revenue_at_risk?: string | null
          segment_impact?: string | null
          shipped_slice_date?: string | null
          slice_deadline_days?: number | null
          slice_due_at?: string | null
          slice_remaining?: never
          solution_domain?:
            | Database["public"]["Enums"]["solution_domain"]
            | null
          status?: Database["public"]["Enums"]["decision_status"] | null
          surface?: string | null
          title?: string | null
          trigger_signal?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "decisions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_role_in_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      is_admin_of_org: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "pod_lead" | "viewer"
      decision_health: "On Track" | "At Risk" | "Degrading"
      decision_status: "Draft" | "Active" | "Blocked" | "Closed"
      impact_tier: "High" | "Medium" | "Low"
      outcome_category:
        | "ARR"
        | "NRR"
        | "DPI_Adoption"
        | "Agent_Trust"
        | "Live_Event_Risk"
        | "Operational_Efficiency"
      prediction_accuracy: "Accurate" | "Partial" | "Missed"
      signal_type:
        | "KPI Deviation"
        | "Segment Variance"
        | "Agent Drift"
        | "Exec Escalation"
        | "Launch Milestone"
        | "Renewal Risk"
        | "Cross-Solution Conflict"
      solution_domain: "S1" | "S2" | "S3" | "Cross"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pod_lead", "viewer"],
      decision_health: ["On Track", "At Risk", "Degrading"],
      decision_status: ["Draft", "Active", "Blocked", "Closed"],
      impact_tier: ["High", "Medium", "Low"],
      outcome_category: [
        "ARR",
        "NRR",
        "DPI_Adoption",
        "Agent_Trust",
        "Live_Event_Risk",
        "Operational_Efficiency",
      ],
      prediction_accuracy: ["Accurate", "Partial", "Missed"],
      signal_type: [
        "KPI Deviation",
        "Segment Variance",
        "Agent Drift",
        "Exec Escalation",
        "Launch Milestone",
        "Renewal Risk",
        "Cross-Solution Conflict",
      ],
      solution_domain: ["S1", "S2", "S3", "Cross"],
    },
  },
} as const
