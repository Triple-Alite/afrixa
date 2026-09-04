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
      certifications: {
        Row: {
          created_at: string
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          issuer: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          message: string | null
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          message?: string | null
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          client_id: string
          created_at: string
          currency: string
          description: string | null
          escrow_id: string | null
          id: string
          opportunity_id: string | null
          proposal_id: string | null
          status: string
          talent_id: string
          title: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          currency?: string
          description?: string | null
          escrow_id?: string | null
          id?: string
          opportunity_id?: string | null
          proposal_id?: string | null
          status?: string
          talent_id: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          escrow_id?: string | null
          id?: string
          opportunity_id?: string | null
          proposal_id?: string | null
          status?: string
          talent_id?: string
          title?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
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
      education_entries: {
        Row: {
          created_at: string
          end_year: number | null
          field_of_study: string | null
          id: string
          qualification: string | null
          school: string
          start_year: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          qualification?: string | null
          school: string
          start_year?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_year?: number | null
          field_of_study?: string | null
          id?: string
          qualification?: string | null
          school?: string
          start_year?: number | null
          updated_at?: string
          user_id?: string
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
          funding_source: string
          id: string
          local_amount: number | null
          local_currency: string | null
          note: string | null
          opportunity_id: string | null
          payment_id: string | null
          proposal_id: string | null
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
          funding_source?: string
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          note?: string | null
          opportunity_id?: string | null
          payment_id?: string | null
          proposal_id?: string | null
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
          funding_source?: string
          id?: string
          local_amount?: number | null
          local_currency?: string | null
          note?: string | null
          opportunity_id?: string | null
          payment_id?: string | null
          proposal_id?: string | null
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
          {
            foreignKeyName: "escrows_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escrows_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
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
      milestones: {
        Row: {
          amount: number
          approved_at: string | null
          contract_id: string
          created_at: string
          currency: string
          deliverable_note: string | null
          deliverable_url: string | null
          description: string | null
          due_date: string | null
          funded_at: string | null
          id: string
          position: number
          started_at: string | null
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          contract_id: string
          created_at?: string
          currency?: string
          deliverable_note?: string | null
          deliverable_url?: string | null
          description?: string | null
          due_date?: string | null
          funded_at?: string | null
          id?: string
          position?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          contract_id?: string
          created_at?: string
          currency?: string
          deliverable_note?: string | null
          deliverable_url?: string | null
          description?: string | null
          due_date?: string | null
          funded_at?: string | null
          id?: string
          position?: number
          started_at?: string | null
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          status: string
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
          status?: string
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
          status?: string
          title?: string
          work_mode?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          authorization_url: string | null
          created_at: string
          currency: string
          escrow_id: string | null
          id: string
          metadata: Json
          proposal_id: string | null
          provider: string
          purpose: string
          reference: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          authorization_url?: string | null
          created_at?: string
          currency?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json
          proposal_id?: string | null
          provider: string
          purpose?: string
          reference: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          authorization_url?: string | null
          created_at?: string
          currency?: string
          escrow_id?: string | null
          id?: string
          metadata?: Json
          proposal_id?: string | null
          provider?: string
          purpose?: string
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_methods: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_code: string | null
          bank_name: string | null
          country: string | null
          created_at: string
          id: string
          is_default: boolean
          method: string
          phone_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          method?: string
          phone_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_code?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          method?: string
          phone_number?: string | null
          updated_at?: string
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
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string
          comment_count: number
          created_at: string
          id: string
          image_url: string | null
          kind: string
          link_url: string | null
          reaction_count: number
          updated_at: string
          visibility: string
        }
        Insert: {
          author_id: string
          body?: string
          comment_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          link_url?: string | null
          reaction_count?: number
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_id?: string
          body?: string
          comment_count?: number
          created_at?: string
          id?: string
          image_url?: string | null
          kind?: string
          link_url?: string | null
          reaction_count?: number
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      profile_skills: {
        Row: {
          created_at: string
          id: string
          level: string
          name: string
          position: number
          updated_at: string
          user_id: string
          years: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          name: string
          position?: number
          updated_at?: string
          user_id: string
          years?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
          years?: number | null
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
          cover_url: string | null
          created_at: string
          discoverable: boolean
          full_name: string
          headline: string | null
          hourly_rate: number | null
          id: string
          languages: string[]
          onboarding_complete: boolean
          preferred_gateway: string | null
          primary_skill: string | null
          profile_strength: number
          profile_views: number
          role: Database["public"]["Enums"]["app_user_role"] | null
          total_earned: number
          updated_at: string
          verified: boolean
          wallet_balance: number
          years_experience: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          client_type?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          discoverable?: boolean
          full_name?: string
          headline?: string | null
          hourly_rate?: number | null
          id: string
          languages?: string[]
          onboarding_complete?: boolean
          preferred_gateway?: string | null
          primary_skill?: string | null
          profile_strength?: number
          profile_views?: number
          role?: Database["public"]["Enums"]["app_user_role"] | null
          total_earned?: number
          updated_at?: string
          verified?: boolean
          wallet_balance?: number
          years_experience?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          business_name?: string | null
          client_type?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string
          discoverable?: boolean
          full_name?: string
          headline?: string | null
          hourly_rate?: number | null
          id?: string
          languages?: string[]
          onboarding_complete?: boolean
          preferred_gateway?: string | null
          primary_skill?: string | null
          profile_strength?: number
          profile_views?: number
          role?: Database["public"]["Enums"]["app_user_role"] | null
          total_earned?: number
          updated_at?: string
          verified?: boolean
          wallet_balance?: number
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
          escrow_id: string | null
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
          escrow_id?: string | null
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
          escrow_id?: string | null
          id?: string
          opportunity_id?: string
          status?: string
          talent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          item_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          item_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
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
      work_experiences: {
        Row: {
          company: string
          created_at: string
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          start_date: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company: string
          created_at?: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          start_date: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          start_date?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_connected: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_post: { Args: { _post_id: string }; Returns: boolean }
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
