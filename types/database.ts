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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_staff: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["staff_role"]
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json
          summary: string
        }
        Insert: {
          action: string
          actor_email: string
          actor_user_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          metadata?: Json
          summary: string
        }
        Update: {
          action?: string
          actor_email?: string
          actor_user_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          metadata?: Json
          summary?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          is_active: boolean
          name: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          name: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          is_active?: boolean
          name?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_domains: {
        Row: {
          added_by: string | null
          company_id: string
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          added_by?: string | null
          company_id: string
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          added_by?: string | null
          company_id?: string
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_domains_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_options"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_profiles: {
        Row: {
          consent_accepted_at: string
          consent_version: string
          created_at: string
          display_name: string
          headline: string | null
          is_candidate: boolean
          is_provider: boolean
          provider_company_id: string | null
          provider_work_email: string | null
          updated_at: string
          user_id: string
          work_email_verified_at: string | null
        }
        Insert: {
          consent_accepted_at?: string
          consent_version: string
          created_at?: string
          display_name: string
          headline?: string | null
          is_candidate?: boolean
          is_provider?: boolean
          provider_company_id?: string | null
          provider_work_email?: string | null
          updated_at?: string
          user_id: string
          work_email_verified_at?: string | null
        }
        Update: {
          consent_accepted_at?: string
          consent_version?: string
          created_at?: string
          display_name?: string
          headline?: string | null
          is_candidate?: boolean
          is_provider?: boolean
          provider_company_id?: string | null
          provider_work_email?: string | null
          updated_at?: string
          user_id?: string
          work_email_verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_profiles_provider_company_id_fkey"
            columns: ["provider_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwaar_profiles_provider_company_id_fkey"
            columns: ["provider_company_id"]
            isOneToOne: false
            referencedRelation: "company_options"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_work_email_codes: {
        Row: {
          attempts: number
          code_hash: string
          expires_at: string
          last_sent_at: string
          sends_in_window: number
          user_id: string
          window_started_at: string
          work_email: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          expires_at: string
          last_sent_at?: string
          sends_in_window?: number
          user_id: string
          window_started_at?: string
          work_email: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          expires_at?: string
          last_sent_at?: string
          sends_in_window?: number
          user_id?: string
          window_started_at?: string
          work_email?: string
        }
        Relationships: []
      }
    }
    Views: {
      company_options: {
        Row: {
          id: string | null
          name: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      dwaar_confirm_work_email: { Args: { p_code: string }; Returns: boolean }
      dwaar_issue_work_email_code: {
        Args: { p_secret: string }
        Returns: {
          out_code: string
          out_work_email: string
        }[]
      }
      email_matches_company: {
        Args: { p_company_id: string; p_email: string }
        Returns: boolean
      }
      is_free_email_domain: { Args: { d: string }; Returns: boolean }
      is_staff: {
        Args: { min_role?: Database["public"]["Enums"]["staff_role"] }
        Returns: boolean
      }
      normalize_domain: { Args: { raw: string }; Returns: string }
      role_rank: {
        Args: { r: Database["public"]["Enums"]["staff_role"] }
        Returns: number
      }
    }
    Enums: {
      staff_role: "viewer" | "moderator" | "admin" | "super_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      staff_role: ["viewer", "moderator", "admin", "super_admin"],
    },
  },
} as const
