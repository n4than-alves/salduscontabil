
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          email: string
          fullName: string | null
          phone: string | null
          planType: string
          planStartDate: string | null
        }
        Insert: {
          id: string
          created_at?: string
          email?: string
          fullName?: string | null
          phone?: string | null
          planType?: string
          planStartDate?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          email?: string
          fullName?: string | null
          phone?: string | null
          planType?: string
          planStartDate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      clients: {
        Row: {
          id: string
          created_at: string
          user_id: string
          name: string
          email: string | null
          phone: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          name: string
          email?: string | null
          phone?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          name?: string
          email?: string | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      transactions: {
        Row: {
          id: string
          created_at: string
          user_id: string
          client_id: string | null
          amount: number
          type: string
          category: string
          description: string
          date: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          client_id?: string | null
          amount: number
          type: string
          category: string
          description: string
          date: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          client_id?: string | null
          amount?: number
          type?: string
          category?: string
          description?: string
          date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
