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
      dwaar_boost_orders: {
        Row: {
          amount_paise: number
          candidate_id: string
          created_at: string
          currency: string
          delivery_attempts: number
          gateway_order_id: string | null
          gateway_payment_id: string | null
          id: string
          paid_at: string | null
          request_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount_paise: number
          candidate_id: string
          created_at?: string
          currency?: string
          delivery_attempts?: number
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          request_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          candidate_id?: string
          created_at?: string
          currency?: string
          delivery_attempts?: number
          gateway_order_id?: string | null
          gateway_payment_id?: string | null
          id?: string
          paid_at?: string | null
          request_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_boost_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "dwaar_referral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_boost_results: {
        Row: {
          candidate_id: string
          changes: Json
          created_at: string
          improved_resume: string | null
          linkedin_tips: Json
          model: string | null
          order_id: string
          profile_tips: Json
          request_id: string
          status: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          changes?: Json
          created_at?: string
          improved_resume?: string | null
          linkedin_tips?: Json
          model?: string | null
          order_id: string
          profile_tips?: Json
          request_id: string
          status: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          changes?: Json
          created_at?: string
          improved_resume?: string | null
          linkedin_tips?: Json
          model?: string | null
          order_id?: string
          profile_tips?: Json
          request_id?: string
          status?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_boost_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "dwaar_boost_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwaar_boost_results_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "dwaar_referral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_profiles: {
        Row: {
          accepts_requests: boolean
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
          weekly_request_limit: number
          work_email_verified_at: string | null
        }
        Insert: {
          accepts_requests?: boolean
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
          weekly_request_limit?: number
          work_email_verified_at?: string | null
        }
        Update: {
          accepts_requests?: boolean
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
          weekly_request_limit?: number
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
      dwaar_provider_notifications: {
        Row: {
          id: number
          provider_id: string
          request_id: string
          sent_at: string
        }
        Insert: {
          id?: never
          provider_id: string
          request_id: string
          sent_at?: string
        }
        Update: {
          id?: never
          provider_id?: string
          request_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_provider_notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "dwaar_referral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_referral_requests: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          candidate_id: string
          company_id: string
          created_at: string
          id: string
          job_description: string | null
          job_id: string | null
          job_title: string
          job_url: string
          note: string | null
          notified_at: string | null
          resume_consent_at: string | null
          resume_path: string | null
          status: Database["public"]["Enums"]["referral_status"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          candidate_id: string
          company_id: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_id?: string | null
          job_title: string
          job_url: string
          note?: string | null
          notified_at?: string | null
          resume_consent_at?: string | null
          resume_path?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          candidate_id?: string
          company_id?: string
          created_at?: string
          id?: string
          job_description?: string | null
          job_id?: string | null
          job_title?: string
          job_url?: string
          note?: string | null
          notified_at?: string | null
          resume_consent_at?: string | null
          resume_path?: string | null
          status?: Database["public"]["Enums"]["referral_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_referral_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dwaar_referral_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_options"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_request_dismissals: {
        Row: {
          provider_id: string
          request_id: string
        }
        Insert: {
          provider_id: string
          request_id: string
        }
        Update: {
          provider_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_request_dismissals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "dwaar_referral_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      dwaar_resume_analyses: {
        Row: {
          candidate_id: string
          created_at: string
          gaps: Json
          model: string | null
          request_id: string
          score: number | null
          status: string
          strengths: Json
          summary: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          gaps?: Json
          model?: string | null
          request_id: string
          score?: number | null
          status: string
          strengths?: Json
          summary?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          gaps?: Json
          model?: string | null
          request_id?: string
          score?: number | null
          status?: string
          strengths?: Json
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dwaar_resume_analyses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "dwaar_referral_requests"
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
      dwaar_analyses_used_today: { Args: never; Returns: number }
      dwaar_role_searches_used_today: { Args: never; Returns: number }
      dwaar_record_role_search: { Args: { p_secret: string }; Returns: boolean }
      dwaar_companies_with_referrers: {
        Args: never
        Returns: {
          out_company_id: string
          out_company_name: string
          out_referrers: number
        }[]
      }
      dwaar_find_check: {
        Args: { p_hash: string; p_secret: string }
        Returns: {
          out_gaps: Json
          out_model: string
          out_score: number
          out_strengths: Json
          out_summary: string
          out_tips: Json
        }[]
      }
      dwaar_record_check: {
        Args: {
          p_gaps: Json
          p_hash: string
          p_model: string
          p_score: number
          p_secret: string
          p_strengths: Json
          p_summary: string
          p_tips: Json
        }
        Returns: boolean
      }
      dwaar_attach_gateway_order: {
        Args: {
          p_gateway_order_id: string
          p_order_id: string
          p_secret: string
        }
        Returns: boolean
      }
      dwaar_cancel_request: { Args: { p_request_id: string }; Returns: boolean }
      dwaar_claim_provider_notifications: {
        Args: { p_request_id: string; p_secret: string }
        Returns: {
          out_company_name: string
          out_job_title: string
          out_name: string
          out_work_email: string
        }[]
      }
      dwaar_offer_next_wave: {
        Args: { p_request_id: string; p_secret: string }
        Returns: {
          out_company_name: string
          out_job_title: string
          out_name: string
          out_work_email: string
        }[]
      }
      dwaar_confirm_work_email: { Args: { p_code: string }; Returns: boolean }
      dwaar_create_request: {
        Args: {
          p_company_id: string
          p_job_description?: string
          p_job_id?: string
          p_job_title: string
          p_job_url: string
          p_note?: string
          p_resume_consent?: boolean
          p_resume_path?: string
        }
        Returns: string
      }
      dwaar_forget_my_requests: {
        Args: { p_request_id?: string }
        Returns: number
      }
      dwaar_get_boost_input: {
        Args: { p_order_id: string }
        Returns: {
          out_company_name: string
          out_job_description: string
          out_job_title: string
          out_request_id: string
        }[]
      }
      dwaar_issue_work_email_code: {
        Args: { p_secret: string }
        Returns: {
          out_code: string
          out_work_email: string
        }[]
      }
      dwaar_mark_boost_paid: {
        Args: {
          p_gateway_order_id: string
          p_gateway_payment_id: string
          p_secret: string
        }
        Returns: boolean
      }
      dwaar_mark_resumes_swept: {
        Args: { p_request_ids: string[]; p_secret: string }
        Returns: number
      }
      dwaar_chat_info: {
        Args: { p_request_id: string }
        Returns: {
          out_can_send: boolean
          out_company_name: string
          out_is_candidate: boolean
          out_job_title: string
          out_other_name: string
        }[]
      }
      dwaar_chat_messages: {
        Args: { p_request_id: string }
        Returns: {
          out_body: string
          out_created_at: string
          out_id: number
          out_mine: boolean
        }[]
      }
      dwaar_send_message: { Args: { p_body: string; p_request_id: string }; Returns: string }
      dwaar_credit_balance: { Args: never; Returns: number }
      dwaar_my_invite_code: { Args: never; Returns: string }
      dwaar_use_invite: { Args: { p_code: string }; Returns: string }
      dwaar_my_accepted_requests: {
        Args: never
        Returns: {
          out_accepted_at: string
          out_candidate_messaged: boolean
          out_candidate_name: string
          out_company_name: string
          out_id: string
          out_job_title: string
          out_job_url: string
          out_my_replies: number
        }[]
      }
      dwaar_my_requests: {
        Args: never
        Returns: {
          out_accepted_at: string
          out_accepted_by_name: string
          out_analysis_status: string
          out_company_id: string
          out_company_name: string
          out_created_at: string
          out_has_resume: boolean
          out_id: string
          out_job_id: string
          out_job_title: string
          out_job_url: string
          out_note: string
          out_score: number
          out_status: string
        }[]
      }
      dwaar_open_requests_for_provider: {
        Args: never
        Returns: {
          out_candidate_headline: string
          out_candidate_name: string
          out_created_at: string
          out_id: string
          out_job_id: string
          out_job_title: string
          out_job_url: string
          out_note: string
        }[]
      }
      dwaar_respond_to_request: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: string
      }
      dwaar_resumes_due_for_sweep: {
        Args: { p_limit?: number; p_secret: string }
        Returns: {
          out_request_id: string
          out_resume_path: string
        }[]
      }
      dwaar_save_analysis: {
        Args: {
          p_gaps: Json
          p_model: string
          p_request_id: string
          p_score: number
          p_secret: string
          p_status: string
          p_strengths: Json
          p_summary: string
        }
        Returns: boolean
      }
      dwaar_save_boost_result: {
        Args: {
          p_changes: Json
          p_improved_resume: string
          p_linkedin_tips: Json
          p_model: string
          p_order_id: string
          p_profile_tips: Json
          p_secret: string
          p_status: string
          p_summary: string
        }
        Returns: boolean
      }
      dwaar_start_boost: {
        Args: { p_request_id: string }
        Returns: {
          out_amount_paise: number
          out_currency: string
          out_gateway_order_id: string
          out_order_id: string
          out_status: string
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
      referral_status: "open" | "accepted" | "cancelled"
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
      referral_status: ["open", "accepted", "cancelled"],
      staff_role: ["viewer", "moderator", "admin", "super_admin"],
    },
  },
} as const
