import { useState, useCallback } from 'react'

export type RectangleState = {
  id: string
  x: number
  y: number
  radius?: number
  width?: number
  height?: number
  color: string
}

export function useRectangles() {
  const [rectangles, setRectangles] = useState<RectangleState[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const hydrateRectangles = useCallback((items: RectangleState[]) => {
    setRectangles(items)
    setSelectedId(null)
  }, [])

  const addRectangle = useCallback((rect: Omit<RectangleState, 'id'>) => {
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newRect = { ...rect, id }
    setRectangles(prev => [...prev, newRect])
    setSelectedId(id)
    return id
  }, [])

  const replaceRectangleId = useCallback((tempId: string, realId: string) => {
    setRectangles(prev => prev.map(r => (r.id === tempId ? { ...r, id: realId } : r)))
    setSelectedId(prev => (prev === tempId ? realId : prev))
  }, [])

  const updateRectangle = useCallback((id: string, updates: Partial<Omit<RectangleState, 'id'>>) => {
    setRectangles(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
  }, [])

  const selectRectangle = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const getSelectedRectangle = useCallback(() => {
    return rectangles.find(r => r.id === selectedId) || null
  }, [rectangles, selectedId])

  const upsertRectangle = useCallback((incoming: RectangleState) => {
    setRectangles(prev => {
      const idx = prev.findIndex(r => r.id === incoming.id)
      if (idx === -1) return [...prev, incoming]
      const next = prev.slice()
      next[idx] = { ...next[idx], ...incoming }
      return next
    })
  }, [])

  return {
    rectangles,
    selectedId,
    hydrateRectangles,
    addRectangle,
    replaceRectangleId,
    updateRectangle,
    selectRectangle,
    getSelectedRectangle,
    upsertRectangle,
  }
}
