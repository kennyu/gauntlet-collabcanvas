import { Rect } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'

export type RectangleProps = {
  id?: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  selected?: boolean
  draggable?: boolean
  dragBoundFunc?: (pos: { x: number; y: number }) => { x: number; y: number }
  onDragStart?: (e: KonvaEventObject<DragEvent>) => void
  onDragMove?: (e: KonvaEventObject<DragEvent>) => void
  onDragEnd?: (e: KonvaEventObject<DragEvent>) => void
  onMouseDown?: (e: KonvaEventObject<MouseEvent>) => void
  onMouseUp?: (e: KonvaEventObject<MouseEvent>) => void
  onClick?: (e: unknown) => void
}

export default function Rectangle({
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  color = '#3b82f6',
  selected = false,
  draggable = false,
  dragBoundFunc,
  onDragStart,
  onDragMove,
  onDragEnd,
  onMouseDown,
  onMouseUp,
  onClick,
}: RectangleProps) {
  const clampedWidth = Math.max(20, width)
  const clampedHeight = Math.max(20, height)
  return (
    <Rect
      x={x}
      y={y}
      width={clampedWidth}
      height={clampedHeight}
      fill={color}
      stroke={selected ? '#3b82f6' : undefined}
      strokeWidth={selected ? 2 : 0}
      draggable={draggable}
      dragBoundFunc={dragBoundFunc}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      listening
      onClick={onClick}
      cornerRadius={4}
    />
  )
}


