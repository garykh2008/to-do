/**
 * 手動撰寫，結構對應 supabase/migrations/0001_init.sql。
 * 待實際連上 VPS 上的 Supabase 之後，建議改用官方 CLI 重新產生：
 *   supabase gen types typescript --schema todo > src/types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  todo: {
    Tables: {
      lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          is_inbox: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          color?: string | null;
          is_inbox?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          is_inbox?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          list_id: string;
          title: string;
          notes: string | null;
          is_completed: boolean;
          completed_at: string | null;
          due_date: string | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          list_id: string;
          title: string;
          notes?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          list_id?: string;
          title?: string;
          notes?: string | null;
          is_completed?: boolean;
          completed_at?: string | null;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "todos_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "lists";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type List = Database["todo"]["Tables"]["lists"]["Row"];
export type ListInsert = Database["todo"]["Tables"]["lists"]["Insert"];
export type ListUpdate = Database["todo"]["Tables"]["lists"]["Update"];

export type Todo = Database["todo"]["Tables"]["todos"]["Row"];
export type TodoInsert = Database["todo"]["Tables"]["todos"]["Insert"];
export type TodoUpdate = Database["todo"]["Tables"]["todos"]["Update"];
