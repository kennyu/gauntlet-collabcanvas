import type { Database } from './supabase'
import { supabase } from './supabase'

type RectangleRow = Database['public']['Tables']['canvas_objects']['Row']
type RectangleInsert = Database['public']['Tables']['canvas_objects']['Insert']
type RectangleUpdate = Database['public']['Tables']['canvas_objects']['Update']

export type RectangleRecord = RectangleRow

export async function loadRectangles(
  canvasId: string,
): Promise<RectangleRecord[]> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('*')
    .eq('canvas_id', canvasId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createRectangle(
  rectangle: RectangleInsert,
): Promise<RectangleRecord> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .insert(rectangle)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateRectangle(
  id: RectangleUpdate['id'],
  rectangle: RectangleUpdate,
): Promise<RectangleRecord> {
  if (!id) {
    throw new Error('Rectangle id required for update')
  }

  const { data, error } = await supabase
    .from('canvas_objects')
    .update(rectangle)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
