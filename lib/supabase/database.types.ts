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
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          avatar_label?: string | null;
          role?: "host" | "organizer" | "seller";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          avatar_label?: string | null;
          role?: "host" | "organizer" | "seller";
          created_at?: string;
          updated_at?: string;
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
          has_vip: boolean;
          has_group_sales: boolean;
          closed_at: string | null;
          closed_by: string | null;
          status: "current" | "upcoming" | "past";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          venue: string;
          description?: string | null;
          event_date: string;
          goal_value?: number;
          has_vip?: boolean;
          has_group_sales?: boolean;
          closed_at?: string | null;
          closed_by?: string | null;
          status?: "current" | "upcoming" | "past";
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          venue?: string;
          description?: string | null;
          event_date?: string;
          goal_value?: number;
          has_vip?: boolean;
          has_group_sales?: boolean;
          closed_at?: string | null;
          closed_by?: string | null;
          status?: "current" | "upcoming" | "past";
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_batches: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          pista_price: number | null;
          vip_price: number | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          pista_price?: number | null;
          vip_price?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          pista_price?: number | null;
          vip_price?: number | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_memberships: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          role: "host" | "organizer" | "seller";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          role?: "host" | "organizer" | "seller";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          role?: "host" | "organizer" | "seller";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          event_id: string;
          seller_user_id: string;
          batch_id: string;
          sale_type: "normal" | "grupo";
          ticket_type: "vip" | "pista";
          quantity: number;
          unit_price: number;
          payment_status: "paid";
          sold_at: string;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          seller_user_id: string;
          batch_id: string;
          sale_type?: "normal" | "grupo";
          ticket_type?: "vip" | "pista";
          quantity?: number;
          unit_price?: number;
          payment_status?: "paid";
          sold_at?: string;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          seller_user_id?: string;
          batch_id?: string;
          sale_type?: "normal" | "grupo";
          ticket_type?: "vip" | "pista";
          quantity?: number;
          unit_price?: number;
          payment_status?: "paid";
          sold_at?: string;
          notes?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sale_attendees: {
        Row: {
          id: string;
          event_id: string;
          sale_id: string;
          seller_user_id: string;
          guest_name: string;
          checked_in_at: string | null;
          checked_in_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          sale_id: string;
          seller_user_id: string;
          guest_name: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          sale_id?: string;
          seller_user_id?: string;
          guest_name?: string;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_guest_entries: {
        Row: {
          id: string;
          event_id: string;
          guest_name: string;
          notes: string | null;
          source_type: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          guest_name: string;
          notes?: string | null;
          source_type?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          guest_name?: string;
          notes?: string | null;
          source_type?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
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
          updated_at: string;
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
          updated_at?: string;
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
          updated_at?: string;
        };
        Relationships: [];
      };
      additional_revenues: {
        Row: {
          id: string;
          event_id: string;
          title: string;
          amount: number;
          category: string | null;
          date: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          amount: number;
          category?: string | null;
          date?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          amount?: number;
          category?: string | null;
          date?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
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
          updated_at: string;
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
          updated_at?: string;
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
          updated_at?: string;
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
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          title: string;
          body: string;
          pinned?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          title?: string;
          body?: string;
          pinned?: boolean;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          event_id: string | null;
          actor_user_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          message: string;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          event_id?: string | null;
          actor_user_id: string;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          message: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string | null;
          actor_user_id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          message?: string;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
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
