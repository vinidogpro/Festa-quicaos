export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_label: string | null;
          role: "host" | "organizer" | "seller";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_label?: string | null;
          role?: "host" | "organizer" | "seller";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_label?: string | null;
          role?: "host" | "organizer" | "seller";
          created_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          slug: string;
          name: string;
          venue: string;
          description: string | null;
          event_date: string;
          goal_value: number;
          status: "current" | "upcoming" | "past";
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          venue: string;
          description?: string | null;
          event_date: string;
          goal_value?: number;
          status?: "current" | "upcoming" | "past";
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          venue?: string;
          description?: string | null;
          event_date?: string;
          goal_value?: number;
          status?: "current" | "upcoming" | "past";
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      event_memberships: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: "host" | "organizer" | "seller";
          ticket_quota: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: "host" | "organizer" | "seller";
          ticket_quota?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: "host" | "organizer" | "seller";
          ticket_quota?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          event_id: string;
          seller_user_id: string;
          quantity: number;
          unit_price: number;
          payment_status: "paid" | "pending";
          sold_at: string;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          seller_user_id: string;
          quantity?: number;
          unit_price?: number;
          payment_status?: "paid" | "pending";
          sold_at?: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          seller_user_id?: string;
          quantity?: number;
          unit_price?: number;
          payment_status?: "paid" | "pending";
          sold_at?: string;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          category: string;
          amount: number;
          incurred_at: string;
          notes: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          category: string;
          amount: number;
          incurred_at?: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          category?: string;
          amount?: number;
          incurred_at?: string;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          owner_profile_id: string | null;
          status: "pending" | "in-progress" | "done";
          due_at: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          owner_profile_id?: string | null;
          status?: "pending" | "in-progress" | "done";
          due_at?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          owner_profile_id?: string | null;
          status?: "pending" | "in-progress" | "done";
          due_at?: string | null;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          body: string;
          pinned: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          body: string;
          pinned?: boolean;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          body?: string;
          pinned?: boolean;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
