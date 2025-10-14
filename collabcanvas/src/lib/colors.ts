export const RECTANGLE_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const

export type RectangleColor = (typeof RECTANGLE_COLORS)[number]

export function getNextColorIndex(currentIndex: number): number {
  const next = currentIndex + 1
  return next >= RECTANGLE_COLORS.length ? 0 : next
}

export function getRectangleColor(index: number): RectangleColor {
  const safeIndex = ((index % RECTANGLE_COLORS.length) + RECTANGLE_COLORS.length) % RECTANGLE_COLORS.length
  return RECTANGLE_COLORS[safeIndex]
}

export function getColorForUserId(userId: string): RectangleColor {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0
  }
  const idx = hash % RECTANGLE_COLORS.length
  return RECTANGLE_COLORS[idx]
}


