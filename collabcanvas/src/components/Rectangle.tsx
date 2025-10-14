import { Rect } from 'react-konva'

export type RectangleProps = {
  id?: string
  x?: number
  y?: number
  width?: number
  height?: number
  color?: string
  onClick?: () => void
}

export default function Rectangle({
  x = 0,
  y = 0,
  width = 100,
  height = 100,
  color = '#3b82f6',
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
      listening
      onClick={onClick}
      cornerRadius={4}
    />
  )
}


