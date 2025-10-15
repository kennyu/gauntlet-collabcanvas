import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage as KonvaStage } from 'konva/lib/Stage'
import { Rectangle, type CanvasRectangle } from './Rectangle'

const WORKSPACE_SIZE = 3000
const GRID_SIZE = 50
const DEFAULT_RECT_SIZE = 100
const MIN_RECT_SIZE = 20
const RECT_COLORS = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
]
const SCALE_MIN = 0.1
const SCALE_MAX = 5
const SCALE_STEP = 1.1

const generateRectangleId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function Canvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [scale, setScale] = useState(1)
  const [rectangles, setRectangles] = useState<CanvasRectangle[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const stageOriginRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

  const gridLines = useMemo(() => {
    const lines = []
    for (let i = GRID_SIZE; i < WORKSPACE_SIZE; i += GRID_SIZE) {
      lines.push(
        <Line
          key={`horizontal-${i}`}
          points={[0, i, WORKSPACE_SIZE, i]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />,
      )
      lines.push(
        <Line
          key={`vertical-${i}`}
          points={[i, 0, i, WORKSPACE_SIZE]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />,
      )
    }
    return lines
  }, [])

  const clampStagePosition = useCallback(
    (next: { x: number; y: number }, nextScale = scale) => {
      const scaledWidth = WORKSPACE_SIZE * nextScale
      const scaledHeight = WORKSPACE_SIZE * nextScale

      const minX =
        viewportSize.width < scaledWidth
          ? viewportSize.width - scaledWidth
          : 0
      const minY =
        viewportSize.height < scaledHeight
          ? viewportSize.height - scaledHeight
          : 0
      const clampedX = Math.max(minX, Math.min(0, next.x))
      const clampedY = Math.max(minY, Math.min(0, next.y))
      return { x: clampedX, y: clampedY }
    },
    [scale, viewportSize.height, viewportSize.width],
  )

  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current
      if (container) {
        setViewportSize({
          width: container.clientWidth,
          height: container.clientHeight,
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    setStagePosition((current) => clampStagePosition(current))
  }, [clampStagePosition])

  useEffect(() => {
    const cancelPan = () => {
      hasMovedRef.current = false
      setIsPanning(false)
    }
    window.addEventListener('mouseup', cancelPan)
    window.addEventListener('touchend', cancelPan)
    window.addEventListener('touchcancel', cancelPan)
    return () => {
      window.removeEventListener('mouseup', cancelPan)
      window.removeEventListener('touchend', cancelPan)
      window.removeEventListener('touchcancel', cancelPan)
    }
  }, [])

  const createRectangleAt = useCallback(
    (position: { x: number; y: number }) => {
      const width = Math.max(DEFAULT_RECT_SIZE, MIN_RECT_SIZE)
      const height = Math.max(DEFAULT_RECT_SIZE, MIN_RECT_SIZE)

      const clampedX = Math.min(
        WORKSPACE_SIZE - width,
        Math.max(0, position.x - width / 2),
      )
      const clampedY = Math.min(
        WORKSPACE_SIZE - height,
        Math.max(0, position.y - height / 2),
      )

      const color = RECT_COLORS[colorIndex]

      setRectangles((current) => [
        ...current,
        {
          id: generateRectangleId(),
          x: clampedX,
          y: clampedY,
          width,
          height,
          color,
        },
      ])
      setColorIndex((index) => (index + 1) % RECT_COLORS.length)
    },
    [colorIndex],
  )

  const getClientCoordinates = (
    event: KonvaEventObject<MouseEvent | TouchEvent>,
  ) => {
    const nativeEvent = event.evt
    if ('touches' in nativeEvent) {
      const touch = nativeEvent.touches[0] ?? nativeEvent.changedTouches[0]
      if (!touch) {
        return null
      }
      return { x: touch.clientX, y: touch.clientY }
    }
    if ('clientX' in nativeEvent) {
      return { x: nativeEvent.clientX, y: nativeEvent.clientY }
    }
    return null
  }

  const getCanvasPointer = (stage: KonvaStage | null) => {
    if (!stage) {
      return null
    }
    const pointer = stage.getPointerPosition()
    if (!pointer) {
      return null
    }
    const stageScale = stage.scaleX()
    const position = stage.position()
    return {
      x: (pointer.x - position.x) / stageScale,
      y: (pointer.y - position.y) / stageScale,
    }
  }

  const handlePanStart = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (
        event.evt instanceof MouseEvent &&
        event.evt.button !== undefined &&
        event.evt.button !== 0
      ) {
        return
      }

      if ('touches' in event.evt) {
        event.evt.preventDefault()
      }

      const clientPoint = getClientCoordinates(event)
      if (!clientPoint) {
        return
      }

      hasMovedRef.current = false
      pointerOriginRef.current = clientPoint
      stageOriginRef.current = stagePosition
      setIsPanning(true)
    },
    [stagePosition],
  )

  const handlePanMove = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isPanning) {
        return
      }

      if ('touches' in event.evt) {
        event.evt.preventDefault()
      }

      const clientPoint = getClientCoordinates(event)
      if (!clientPoint) {
        return
      }

      const dx = clientPoint.x - pointerOriginRef.current.x
      const dy = clientPoint.y - pointerOriginRef.current.y
      if (!hasMovedRef.current && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
        hasMovedRef.current = true
      }
      setStagePosition(
        clampStagePosition({
          x: stageOriginRef.current.x + dx,
          y: stageOriginRef.current.y + dy,
        }),
      )
    },
    [clampStagePosition, isPanning],
  )

  const handlePanEnd = useCallback(
    (event?: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!isPanning) {
        return
      }

      setIsPanning(false)

      if (!event) {
        hasMovedRef.current = false
        return
      }

      if ('touches' in event.evt) {
        event.evt.preventDefault()
      }

      if (hasMovedRef.current) {
        hasMovedRef.current = false
        return
      }

      const stage = event.target.getStage()
      const pointer = getCanvasPointer(stage)
      if (!stage || !pointer) {
        hasMovedRef.current = false
        return
      }

      const target = event.target
      const isBackgroundClick =
        target === stage || target?.name() === 'canvas-background'

      if (!isBackgroundClick) {
        hasMovedRef.current = false
        return
      }

      createRectangleAt(pointer)
      hasMovedRef.current = false
    },
    [createRectangleAt, isPanning],
  )

  const handleWheel = useCallback(
    (event: KonvaEventObject<WheelEvent>) => {
      event.evt.preventDefault()
      const stage = event.target.getStage()
      if (!stage) {
        return
      }

      const pointer = getCanvasPointer(stage)
      if (!pointer) {
        return
      }

      const direction = event.evt.deltaY > 0 ? 1 / SCALE_STEP : SCALE_STEP
      let nextScale = scale * direction
      nextScale = Math.min(SCALE_MAX, Math.max(SCALE_MIN, nextScale))

      if (nextScale === scale) {
        return
      }

      const pointerPosition = stage.getPointerPosition()
      if (!pointerPosition) {
        return
      }

      const newStagePos = {
        x: pointerPosition.x - pointer.x * nextScale,
        y: pointerPosition.y - pointer.y * nextScale,
      }

      setScale(nextScale)
      setStagePosition(clampStagePosition(newStagePos, nextScale))
    },
    [clampStagePosition, scale],
  )

  return (
    <div
      ref={containerRef}
      className={`canvas-root${isPanning ? ' canvas-root--panning' : ''}`}
    >
      <Stage
        width={viewportSize.width}
        height={viewportSize.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onTouchStart={handlePanStart}
        onTouchMove={handlePanMove}
        onTouchEnd={handlePanEnd}
        onTouchCancel={handlePanEnd}
        onWheel={handleWheel}
      >
        <Layer>
          <Rect
            width={WORKSPACE_SIZE}
            height={WORKSPACE_SIZE}
            fill="#ffffff"
            name="canvas-background"
            listening
          />
          <Group listening={false}>{gridLines}</Group>
          <Group>
            {rectangles.map((rectangle) => (
              <Rectangle key={rectangle.id} rectangle={rectangle} />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
