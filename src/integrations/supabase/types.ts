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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          created_at: string
          id: string
          level: string
          score: number
          skill: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          score?: number
          skill: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          score?: number
          skill?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          participant_a: string
          participant_b: string
          subject: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a: string
          participant_b: string
          subject?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          participant_a?: string
          participant_b?: string
          subject?: string | null
        }
        Relationships: []
      }
      escrows: {
        Row: {
          amount: number
          client_id: string | null
          company: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          funded_at: string | null
          id: string
          local_amount: number | null
          local_currency: string | null
          opportunity_id: string | null
          released_at: string | null
          started_at: string | null
          status: string
          talent_id: string | null
          title: string
        }
        Insert: {
          amount?: number
          client_id?: string | null
          company?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          funded_at?: string | null
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          opportunity_id?: string | null
          released_at?: string | null
          started_at?: string | null
          status?: string
          talent_id?: string | null
          title?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          funded_at?: string | null
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          opportunity_id?: string | null
          released_at?: string | null
          started_at?: string | null
          status?: string
          talent_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category: string
          client_id: string | null
          company: string
          country: string | null
          created_at: string
          currency: string
          deadline: string | null
          delivery_days: number | null
          description: string | null
          escrow_funded: boolean
          experience_level: string | null
          id: string
          image_url: string | null
          job_type: string | null
          price_from: number | null
          rating: number | null
          reviews_count: number
          skills: string[]
          title: string
          work_mode: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          client_id?: string | null
          company?: string
          country?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          delivery_days?: number | null
          description?: string | null
          escrow_funded?: boolean
          experience_level?: string | null
          id?: string
          image_url?: string | null
          job_type?: string | null
          price_from?: number | null
          rating?: number | null
          reviews_count?: number
          skills?: string[]
          title: string
          work_mode?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category?: string
          client_id?: string | null
          company?: string
          country?: string | null
          created_at?: string
          currency?: string
          deadline?: string | null
          delivery_days?: number | null
          description?: string | null
          escrow_funded?: boolean
          experience_level?: string | null
          id?: string
          image_url?: string | null
          job_type?: string | null
          price_from?: number | null
          rating?: number | null
          reviews_count?: number
          skills?: string[]
          title?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      payout_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          country: string | null
          created_at: string
          id: string
          method: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          method?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          method?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          link_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          link_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          business_name: string | null
          client_type: string | null
          country: string | null
          created_at: string
          full_name: string
          headline: string | null
          id: string
          languages: string[]
          onboarding_complete: boolean
          primary_skill: string | null
          profile_strength: number
          role: Database["public"]["Enums"]["app_user_role"] | null
          total_earned: number
          updated_at: string
          verified: boolean
          years_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          client_type?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          headline?: string | null
          id: string
          languages?: string[]
          onboarding_complete?: boolean
          primary_skill?: string | null
          profile_strength?: number
          role?: Database["public"]["Enums"]["app_user_role"] | null
          total_earned?: number
          updated_at?: string
          verified?: boolean
          years_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          client_type?: string | null
          country?: string | null
          created_at?: string
          full_name?: string
          headline?: string | null
          id?: string
          languages?: string[]
          onboarding_complete?: boolean
          primary_skill?: string | null
          profile_strength?: number
          role?: Database["public"]["Enums"]["app_user_role"] | null
          total_earned?: number
          updated_at?: string
          verified?: boolean
          years_experience?: string | null
        }
        Relationships: []
      }
      proposals: {
        Row: {
          bid_amount: number | null
          cover_letter: string
          created_at: string
          currency: string
          delivery_days: number | null
          id: string
          opportunity_id: string
          status: string
          talent_id: string
        }
        Insert: {
          bid_amount?: number | null
          cover_letter?: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          opportunity_id: string
          status?: string
          talent_id: string
        }
        Update: {
          bid_amount?: number | null
          cover_letter?: string
          created_at?: string
          currency?: string
          delivery_days?: number | null
          id?: string
          opportunity_id?: string
          status?: string
          talent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_user_role: "talent" | "client"
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
      app_user_role: ["talent", "client"],
    },
  },
} as const
