import { Circle as KonvaCircle } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'

type Props = {
  id?: string
  x: number
  y: number
  radius: number
  color: string
  selected?: boolean
  draggable?: boolean
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void
  onClick?: () => void
}

export default function Circle({
  x,
  y,
  radius,
  color,
  selected = false,
  draggable = false,
  onMouseDown,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
}: Props) {
  const clampedRadius = Math.max(10, radius)
  return (
    <KonvaCircle
      x={x}
      y={y}
      radius={clampedRadius}
      fill={color}
      stroke={selected ? '#3b82f6' : undefined}
      strokeWidth={selected ? 2 : 0}
      draggable={draggable}
      onMouseDown={onMouseDown}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onClick={onClick}
      listening
    />
  )
}


