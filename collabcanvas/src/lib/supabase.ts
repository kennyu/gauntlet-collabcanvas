import { createClient } from '@supabase/supabase-js'

export const realtimeSchema = 'public'

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
          canvas_id: string
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
          canvas_id: string
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
          canvas_id?: string
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
          },
          {
            foreignKeyName: 'canvas_objects_canvas_id_fkey'
            columns: ['canvas_id']
            referencedRelation: 'canvases'
            referencedColumns: ['id']
          }
        ]
      }
      canvases: {
        Row: {
          created_at: string | null
          id: string
          name: string
          owner_user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
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
