import type { KonvaEventObject } from 'konva/lib/Node'
import { Rect } from 'react-konva'

export type CanvasRectangle = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

type RectangleProps = {
  rectangle: CanvasRectangle
  isSelected: boolean
  onSelect: () => void
  onDragMove: (
    event: KonvaEventObject<DragEvent>
  ) => { x: number; y: number } | void
  onDragEnd: (
    event: KonvaEventObject<DragEvent>
  ) => { x: number; y: number } | void
}

export function Rectangle({
  rectangle,
  isSelected,
  onSelect,
  onDragMove,
  onDragEnd,
}: RectangleProps) {
  return (
    <Rect
      x={rectangle.x}
      y={rectangle.y}
      width={rectangle.width}
      height={rectangle.height}
      fill={rectangle.color}
      stroke={isSelected ? '#2563eb' : undefined}
      strokeWidth={
        isSelected
          ? 2 /
            (typeof window !== 'undefined' ? window.devicePixelRatio : 1)
          : undefined
      }
      draggable
      onMouseDown={(event) => {
        event.cancelBubble = true
        onSelect()
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true
        onSelect()
      }}
      onDragMove={(event) => {
        const nextPosition = onDragMove(event)
        if (nextPosition) {
          event.target.position(nextPosition)
        }
      }}
      onDragEnd={(event) => {
        const nextPosition = onDragEnd(event)
        if (nextPosition) {
          event.target.position(nextPosition)
        }
      }}
      onClick={(event) => {
        event.cancelBubble = true
        onSelect()
      }}
      onTap={(event) => {
        event.cancelBubble = true
        onSelect()
      }}
      onDragStart={(event) => {
        event.cancelBubble = true
        onSelect()
      }}
      onMouseUp={(event) => {
        event.cancelBubble = true
      }}
      onTouchEnd={(event) => {
        event.cancelBubble = true
      }}
      onMouseLeave={(event) => {
        if (!event.evt.buttons) {
          event.cancelBubble = true
        }
      }}
      cornerRadius={6}
      shadowForStrokeEnabled={false}
      perfectDrawEnabled={false}
    />
  )
}
