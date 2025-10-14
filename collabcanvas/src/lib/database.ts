import { supabase } from './supabase'
import type { RectangleState } from '../hooks/useRectangles'

export type DbRectangle = {
  id: string
  type: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  color: string
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export async function loadRectangles(): Promise<RectangleState[]> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .select('id, type, x, y, width, height, color')
    .eq('type', 'rectangle')
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data || []).map((r: any) => ({
    id: r.id as string,
    x: r.x as number,
    y: r.y as number,
    width: r.width as number,
    height: r.height as number,
    color: r.color as string,
  }))
}

export async function createRectangle(
  rect: Omit<RectangleState, 'id'>,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from('canvas_objects')
    .insert([
      {
        type: 'rectangle',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        color: rect.color,
        created_by: userId,
      },
    ])
    .select('id')
    .single()

  if (error) throw error
  return (data as { id: string }).id
}

export type RectangleUpdate = Partial<Pick<RectangleState, 'x' | 'y' | 'width' | 'height' | 'color'>>

export async function updateRectangle(id: string, updates: RectangleUpdate): Promise<void> {
  const { error } = await supabase.from('canvas_objects').update(updates).eq('id', id)
  if (error) throw error
}


