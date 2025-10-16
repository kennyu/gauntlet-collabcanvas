import type { KonvaEventObject } from 'konva/lib/Node'
import { Group, Rect, Text } from 'react-konva'

export type CanvasRectangle = {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  canvasId: string
  updatedAt: string | null
}

type RectangleProps = {
  rectangle: CanvasRectangle
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
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
  onDelete,
  onDragMove,
  onDragEnd,
}: RectangleProps) {
  const deleteButtonSize = 24

  return (
    <Group
      x={rectangle.x}
      y={rectangle.y}
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
    >
      <Rect
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
        cornerRadius={6}
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
      />
      {isSelected ? (
        <Group
          x={rectangle.width}
          y={0}
          listening
          onMouseDown={(event) => {
            event.cancelBubble = true
          }}
          onTouchStart={(event) => {
            event.cancelBubble = true
          }}
          onClick={(event) => {
            event.cancelBubble = true
            onDelete()
          }}
          onTap={(event) => {
            event.cancelBubble = true
            onDelete()
          }}
        >
          <Rect
            x={-deleteButtonSize / 2}
            y={-deleteButtonSize / 2}
            width={deleteButtonSize}
            height={deleteButtonSize}
            cornerRadius={deleteButtonSize / 2}
            fill="rgba(15, 23, 42, 0.9)"
            shadowForStrokeEnabled={false}
            perfectDrawEnabled={false}
          />
          <Text
            text="×"
            x={-deleteButtonSize / 2}
            y={-deleteButtonSize / 2 + 1}
            width={deleteButtonSize}
            height={deleteButtonSize}
            align="center"
            verticalAlign="middle"
            fill="#f8fafc"
            fontSize={deleteButtonSize * 0.7}
            fontStyle="bold"
            listening={false}
          />
        </Group>
      ) : null}
    </Group>
  )
}
