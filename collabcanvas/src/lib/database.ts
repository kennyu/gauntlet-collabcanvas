import type { Database } from './supabase'
import { supabase } from './supabase'

type RectangleRow = Database['public']['Tables']['canvas_objects']['Row']
type RectangleInsert = Database['public']['Tables']['canvas_objects']['Insert']
type RectangleUpdate = Database['public']['Tables']['canvas_objects']['Update']
type CanvasRow = Database['public']['Tables']['canvases']['Row']

export type RectangleRecord = RectangleRow
export type CanvasRecord = CanvasRow

export async function ensureCanvasByName(
  name: string,
): Promise<CanvasRecord> {
  const { data, error } = await supabase
    .from('canvases')
    .select('*')
    .eq('name', name)
    .limit(1)

  if (error) {
    throw error
  }

  if (data && data.length > 0) {
    return data[0]
  }

  const { data: inserted, error: insertError } = await supabase
    .from('canvases')
    .insert({ name })
    .select()
    .single()

  if (insertError) {
    throw insertError
  }

  return inserted
}

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
