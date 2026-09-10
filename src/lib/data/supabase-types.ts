/**
 * Database type for the Supabase client, hand-mirroring the schema in
 * supabase/migrations/0001_init.sql, 0002_games_and_gallery.sql and
 * 0003_app_runtime.sql (dates/timestamps arrive as strings, uuids as
 * strings).
 *
 * If the schema drifts, regenerate with:
 *   npx supabase gen types typescript --project-id <ref> --schema public
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          role: "admin" | "treasurer" | "member";
          position: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          role?: "admin" | "treasurer" | "member";
          position?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          phone?: string | null;
          email?: string | null;
          role?: "admin" | "treasurer" | "member";
          position?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          id: string;
          name: string;
          phone: string;
          street: string;
          role: "President" | "Secretary" | "Treasurer" | "Coordinator" | "Member" | "Volunteer";
          joined_date: string;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone: string;
          street?: string;
          role?: "President" | "Secretary" | "Treasurer" | "Coordinator" | "Member" | "Volunteer";
          joined_date: string;
          photo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["members"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          name: string;
          tamil_name: string;
          type: "festival" | "sports" | "community" | "meeting" | "other";
          status: "registration" | "upcoming" | "active" | "completed";
          start_date: string;
          end_date: string;
          location: string;
          description: string;
          cover_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tamil_name?: string;
          type: "festival" | "sports" | "community" | "meeting" | "other";
          status?: "registration" | "upcoming" | "active" | "completed";
          start_date: string;
          end_date: string;
          location?: string;
          description?: string;
          cover_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          receipt_number: string;
          person_name: string;
          phone: string | null;
          street: string | null;
          amount: number;
          payment_method: "cash" | "upi" | "bank" | "other";
          contribution_type: "name" | "name_phone" | "voice";
          date: string;
          event_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_by_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          receipt_number?: string;
          person_name: string;
          phone?: string | null;
          street?: string | null;
          amount: number;
          payment_method: "cash" | "upi" | "bank" | "other";
          contribution_type?: "name" | "name_phone" | "voice";
          date: string;
          event_id?: string | null;
          notes?: string | null;
          created_by?: string | null;
          created_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          title: string;
          category:
            | "Decoration" | "Food" | "Sound" | "Lighting" | "Pandal" | "Idol"
            | "Sports" | "Prizes" | "Transport" | "Cleaning" | "Printing" | "Other";
          amount: number;
          event_id: string | null;
          paid_by: string;
          date: string;
          payment_method: "cash" | "upi" | "bank" | "other";
          description: string | null;
          bill_url: string | null;
          created_by: string | null;
          created_by_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          category: Database["public"]["Tables"]["expenses"]["Row"]["category"];
          amount: number;
          event_id?: string | null;
          paid_by: string;
          date: string;
          payment_method: "cash" | "upi" | "bank" | "other";
          description?: string | null;
          bill_url?: string | null;
          created_by?: string | null;
          created_by_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["expenses"]["Insert"]>;
        Relationships: [];
      };
      receipts: {
        Row: {
          id: string;
          collection_id: string;
          event_id: string | null;
          receipt_number: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          event_id?: string | null;
          receipt_number: string;
          issued_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["receipts"]["Insert"]>;
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_name: string;
          action: "added" | "edited" | "deleted";
          entity: "collection" | "expense" | "event" | "member" | "settings" | "game" | "gallery";
          label: string;
          amount: number | null;
          event_name: string | null;
          at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_name: string;
          action: "added" | "edited" | "deleted";
          entity: Database["public"]["Tables"]["activity_logs"]["Row"]["entity"];
          label: string;
          amount?: number | null;
          event_name?: string | null;
          at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["activity_logs"]["Insert"]>;
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          event_id: string | null;
          name: string;
          tamil_name: string;
          kind: "running" | "cricket" | "football" | "tug" | "spoon" | "other";
          mode: "team" | "individual";
          status: "open" | "ongoing" | "results" | "completed";
          rules: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          name: string;
          tamil_name?: string;
          kind: "running" | "cricket" | "football" | "tug" | "spoon" | "other";
          mode?: "team" | "individual";
          status?: "open" | "ongoing" | "results" | "completed";
          rules?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          game_id: string;
          name: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          name: string;
          color?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      participants: {
        Row: {
          id: string;
          game_id: string;
          team_id: string | null;
          member_id: string | null;
          name: string;
          phone: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          team_id?: string | null;
          member_id?: string | null;
          name: string;
          phone?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["participants"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
          id: string;
          game_id: string;
          round: string;
          team_a_id: string | null;
          team_b_id: string | null;
          score_a: number | null;
          score_b: number | null;
          status: "pending" | "played";
          winner_team_id: string | null;
          note: string | null;
          played_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          round?: string;
          team_a_id?: string | null;
          team_b_id?: string | null;
          score_a?: number | null;
          score_b?: number | null;
          status?: "pending" | "played";
          winner_team_id?: string | null;
          note?: string | null;
          played_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      game_results: {
        Row: {
          id: string;
          game_id: string;
          team_id: string | null;
          participant_id: string | null;
          position: 1 | 2 | 3;
          kind: "team" | "participant" | "title";
          label: string | null;
          notes: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          team_id?: string | null;
          participant_id?: string | null;
          position: 1 | 2 | 3;
          kind?: "team" | "participant" | "title";
          label?: string | null;
          notes?: string | null;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["game_results"]["Insert"]>;
        Relationships: [];
      };
      gallery: {
        Row: {
          id: string;
          event_id: string | null;
          url: string;
          caption: string | null;
          uploaded_by: string | null;
          uploaded_by_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          url: string;
          caption?: string | null;
          uploaded_by?: string | null;
          uploaded_by_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["gallery"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: {
          id: boolean;
          public_view: boolean;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          public_view?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      transparency_overview: {
        Row: {
          total_varavu: number;
          total_selavu: number;
          member_count: number;
          events: Json | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      has_role: {
        Args: { required: string };
        Returns: boolean;
      };
      next_receipt: {
        Args: { p_date: string };
        Returns: string;
      };
      public_overview: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      user_email_by_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      create_user_profile: {
        Args: {
          p_email: string;
          p_id: string;
          p_name: string;
          p_phone: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
