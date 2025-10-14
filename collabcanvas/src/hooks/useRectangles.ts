import { useState, useCallback } from 'react'

export type RectangleState = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

export function useRectangles() {
  const [rectangles, setRectangles] = useState<RectangleState[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const addRectangle = useCallback((rect: Omit<RectangleState, 'id'>) => {
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const newRect = { ...rect, id }
    setRectangles(prev => [...prev, newRect])
    setSelectedId(id)
    return id
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

  return {
    rectangles,
    selectedId,
    addRectangle,
    updateRectangle,
    selectRectangle,
    getSelectedRectangle,
  }
}
