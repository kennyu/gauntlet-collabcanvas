import type { PostgrestError } from '@supabase/supabase-js'
import { supabase, type Database } from './supabase'

const TABLE_NAME = 'canvas_objects'
const DEFAULT_CANVAS_ID = '95ff5e46-b1d2-46fb-b1dd-747bd070b1fa'
const CANVAS_ID =
  import.meta.env.VITE_SUPABASE_CANVAS_ID?.trim() || DEFAULT_CANVAS_ID

export const ACTIVE_CANVAS_ID = CANVAS_ID

const log = (...args: unknown[]) => {
  console.log('[DatabaseSync]', ...args)
}

export type CanvasObjectRow =
  Database['public']['Tables']['canvas_objects']['Row']
type CanvasObjectInsert =
  Database['public']['Tables']['canvas_objects']['Insert']
type CanvasObjectUpdate =
  Database['public']['Tables']['canvas_objects']['Update']

type CreateRectangleInput = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
}

type UpdateRectangleInput = {
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  updatedAt?: string
  canvasId?: string
}

const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
): Promise<T> => {
  const { data, error } = await operation()
  if (error) {
    console.error('[DatabaseSync] Operation failed', error)
    throw error
  }
  if (data === null) {
    throw new Error('Supabase returned null data')
  }
  return data
}

export async function loadRectangles(): Promise<CanvasObjectRow[]> {
  log('Loading rectangles for canvas', CANVAS_ID)
  const data = await withErrorHandling<CanvasObjectRow[]>(async () =>
    supabase
      .from(TABLE_NAME)
      .select('*')
      .or(`canvas_id.eq.${CANVAS_ID},canvas_id.is.null`)
      .order('created_at', { ascending: true }),
  )
  log('Loaded rectangles response', data)
  return data
}

export async function createRectangle(
  rectangle: CreateRectangleInput,
): Promise<CanvasObjectRow> {
  log('Creating rectangle in database', rectangle)
  const payload: CanvasObjectInsert = {
    id: rectangle.id,
    x: rectangle.x,
    y: rectangle.y,
    width: rectangle.width,
    height: rectangle.height,
    color: rectangle.color,
    type: 'rectangle',
    created_at: rectangle.createdAt,
    updated_at: rectangle.updatedAt,
    created_by: rectangle.createdBy ?? undefined,
    canvas_id: CANVAS_ID,
  }

  const data = await withErrorHandling<CanvasObjectRow>(async () =>
    supabase
      .from(TABLE_NAME)
      .insert(payload)
      .select()
      .single(),
  )

  log('Created rectangle response', data)
  return data
}

export async function updateRectangle(
  id: string,
  updates: UpdateRectangleInput,
): Promise<CanvasObjectRow> {
  log('Updating rectangle in database', { id, updates })
  const payload: CanvasObjectUpdate = {
    updated_at: updates.updatedAt ?? new Date().toISOString(),
  }

  if (updates.x !== undefined) {
    payload.x = updates.x
  }
  if (updates.y !== undefined) {
    payload.y = updates.y
  }
  if (updates.width !== undefined) {
    payload.width = updates.width
  }
  if (updates.height !== undefined) {
    payload.height = updates.height
  }
  if (updates.color !== undefined) {
    payload.color = updates.color
  }
  if (updates.canvasId !== undefined) {
    payload.canvas_id = updates.canvasId
  }

  const filterCanvasId = updates.canvasId ?? CANVAS_ID
  log('Resolved filter canvas', { id, filterCanvasId, payload })

  const data = await withErrorHandling<CanvasObjectRow>(async () =>
    supabase
      .from(TABLE_NAME)
      .update(payload)
      .eq('id', id)
      .eq('canvas_id', filterCanvasId)
      .select()
      .single(),
  )

  log('Updated rectangle response', data)
  return data
}
