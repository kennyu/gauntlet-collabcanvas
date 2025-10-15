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
}

export function Rectangle({ rectangle }: RectangleProps) {
  return (
    <Rect
      x={rectangle.x}
      y={rectangle.y}
      width={rectangle.width}
      height={rectangle.height}
      fill={rectangle.color}
      listening
      cornerRadius={6}
      shadowForStrokeEnabled={false}
      perfectDrawEnabled={false}
    />
  )
}
