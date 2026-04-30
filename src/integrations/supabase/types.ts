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
      announcements: {
        Row: {
          content: string
          created_at: string
          ends_at: string | null
          id: string
          priority: number
          starts_at: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          ends_at?: string | null
          id?: string
          priority?: number
          starts_at?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          priority?: number
          starts_at?: string
          title?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "secret_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          route: string | null
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          route?: string | null
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          route?: string | null
          title?: string
        }
        Relationships: []
      }
      lie_guesses: {
        Row: {
          created_at: string
          guessed_index: number
          guesser_id: string
          id: string
          target_id: string
          was_correct: boolean
        }
        Insert: {
          created_at?: string
          guessed_index: number
          guesser_id: string
          id?: string
          target_id: string
          was_correct: boolean
        }
        Update: {
          created_at?: string
          guessed_index?: number
          guesser_id?: string
          id?: string
          target_id?: string
          was_correct?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          awarded_avatar: boolean
          awarded_facts: boolean
          awarded_instagram: boolean
          created_at: string
          dark_mode: boolean
          id: string
          instagram_tag: string | null
          language: string
          name: string
          onboarded: boolean
          points: number
          surname: string
          three_facts: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          awarded_avatar?: boolean
          awarded_facts?: boolean
          awarded_instagram?: boolean
          created_at?: string
          dark_mode?: boolean
          id: string
          instagram_tag?: string | null
          language?: string
          name: string
          onboarded?: boolean
          points?: number
          surname: string
          three_facts?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          awarded_avatar?: boolean
          awarded_facts?: boolean
          awarded_instagram?: boolean
          created_at?: string
          dark_mode?: boolean
          id?: string
          instagram_tag?: string | null
          language?: string
          name?: string
          onboarded?: boolean
          points?: number
          surname?: string
          three_facts?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      secret_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          hidden: boolean
          id: string
          likes_count: number
          secret_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          hidden?: boolean
          id?: string
          likes_count?: number
          secret_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          hidden?: boolean
          id?: string
          likes_count?: number
          secret_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_comments_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      secret_likes: {
        Row: {
          created_at: string
          id: string
          secret_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          secret_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          secret_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secret_likes_secret_id_fkey"
            columns: ["secret_id"]
            isOneToOne: false
            referencedRelation: "secrets"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          author_id: string
          comments_count: number
          content: string
          created_at: string
          hidden: boolean
          id: string
          likes_count: number
        }
        Insert: {
          author_id: string
          comments_count?: number
          content: string
          created_at?: string
          hidden?: boolean
          id?: string
          likes_count?: number
        }
        Update: {
          author_id?: string
          comments_count?: number
          content?: string
          created_at?: string
          hidden?: boolean
          id?: string
          likes_count?: number
        }
        Relationships: []
      }
      user_game_scores: {
        Row: {
          game_id: string
          id: string
          played_at: string
          score: number
          user_id: string
        }
        Insert: {
          game_id: string
          id?: string
          played_at?: string
          score?: number
          user_id: string
        }
        Update: {
          game_id?: string
          id?: string
          played_at?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_game_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          instagram_tag: string | null
          name: string | null
          points: number | null
          surname: string | null
          three_facts: Json | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          instagram_tag?: string | null
          name?: string | null
          points?: number | null
          surname?: string | null
          three_facts?: never
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string | null
          instagram_tag?: string | null
          name?: string | null
          points?: number | null
          surname?: string | null
          three_facts?: never
        }
        Relationships: []
      }
    }
    Functions: {
      get_my_lie_guesses: {
        Args: never
        Returns: {
          guessed_index: number
          lie_index: number
          target_id: string
          was_correct: boolean
        }[]
      }
      get_public_comments: {
        Args: { _secret_id: string }
        Returns: {
          author_avatar: string
          author_name: string
          content: string
          created_at: string
          id: string
          likes_count: number
          secret_id: string
        }[]
      }
      get_public_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          instagram_tag: string
          name: string
          points: number
          surname: string
          three_facts: Json
        }[]
      }
      get_public_secrets: {
        Args: never
        Returns: {
          comments_count: number
          content: string
          created_at: string
          hidden: boolean
          id: string
          likes_count: number
        }[]
      }
      guess_lie: {
        Args: { _guessed_index: number; _target_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
