import { Stage, Layer, Line, Group } from 'react-konva'
import { useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'

const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 3000
const GRID_SIZE = 50

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function Canvas() {
  const [stageSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  // Fixed virtual canvas size; Stage will be viewport-sized, content is 3000x3000
  const layerSize = useMemo(() => ({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }), [])

  const gridLines = useMemo(() => {
    const lines: ReactElement[] = []
    // Vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      lines.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, CANVAS_HEIGHT]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />,
      )
    }
    // Horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      lines.push(
        <Line
          key={`h-${y}`}
          points={[0, y, CANVAS_WIDTH, y]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />,
      )
    }
    return lines
  }, [])

  const getPanBounds = (s: number) => {
    const contentWidth = CANVAS_WIDTH * s
    const contentHeight = CANVAS_HEIGHT * s
    const hasHorizontalOverflow = contentWidth > stageSize.width
    const hasVerticalOverflow = contentHeight > stageSize.height

    let minX: number
    let maxX: number
    let minY: number
    let maxY: number

    if (hasHorizontalOverflow) {
      minX = stageSize.width - contentWidth
      maxX = 0
    } else {
      const centerX = (stageSize.width - contentWidth) / 2
      minX = centerX
      maxX = centerX
    }

    if (hasVerticalOverflow) {
      minY = stageSize.height - contentHeight
      maxY = 0
    } else {
      const centerY = (stageSize.height - contentHeight) / 2
      minY = centerY
      maxY = centerY
    }

    return { minX, maxX, minY, maxY, hasHorizontalOverflow, hasVerticalOverflow }
  }

  const { minX, maxX, minY, maxY, hasHorizontalOverflow, hasVerticalOverflow } = useMemo(
    () => getPanBounds(scale),
    [scale, stageSize.width, stageSize.height],
  )

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    if (!stage) return

    const oldScale = scale
    const pointer = stage.getPointerPosition() || { x: stageSize.width / 2, y: stageSize.height / 2 }
    const scaleBy = 1.05
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const newScale = clamp(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy, 0.1, 5)

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    }

    const boundsAtNewScale = getPanBounds(newScale)
    const clampedPos = {
      x: clamp(newPos.x, boundsAtNewScale.minX, boundsAtNewScale.maxX),
      y: clamp(newPos.y, boundsAtNewScale.minY, boundsAtNewScale.maxY),
    }

    setScale(newScale)
    setStagePos(clampedPos)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        draggable={hasHorizontalOverflow || hasVerticalOverflow}
        dragBoundFunc={(pos) => ({
          x: clamp(pos.x, minX, maxX),
          y: clamp(pos.y, minY, maxY),
        })}
        onDragMove={(e) => {
          const p = e.target.position()
          setStagePos({ x: p.x, y: p.y })
        }}
        onWheel={handleWheel}
      >
        <Layer width={layerSize.width} height={layerSize.height}>
          <Group>{gridLines}</Group>
        </Layer>
      </Stage>
    </div>
  )
}


