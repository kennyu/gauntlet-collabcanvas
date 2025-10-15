import { createClient } from '@supabase/supabase-js'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      canvas_objects: {
        Row: {
          color: string
          created_at: string | null
          created_by: string | null
          height: number
          id: string
          type: string
          updated_at: string | null
          width: number
          x: number
          y: number
          canvas_id: string | null
        }
        Insert: {
          color: string
          created_at?: string | null
          created_by?: string | null
          height: number
          id?: string
          type?: string
          updated_at?: string | null
          width: number
          x: number
          y: number
          canvas_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          created_by?: string | null
          height?: number
          id?: string
          type?: string
          updated_at?: string | null
          width?: number
          x?: number
          y?: number
          canvas_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'canvas_objects_created_by_fkey'
            columns: ['created_by']
            referencedRelation: 'users'
            referencedColumns: ['id']
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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
