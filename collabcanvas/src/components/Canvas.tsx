import { Stage, Layer, Line, Group, Rect, Text } from 'react-konva'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import Rectangle from './Rectangle'
import { getRectangleColor, getNextColorIndex } from '../lib/colors'
import { useRectangles } from '../hooks/useRectangles'
import { createRectangle as dbCreateRectangle, loadRectangles, updateRectangle as dbUpdateRectangle } from '../lib/database'

const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 3000
const GRID_SIZE = 50
const MIN_RECT_SIZE = 20
const DEFAULT_RECT_SIZE = 100


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function Canvas() {
  const [stageSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [currentColorIndex, setCurrentColorIndex] = useState(0)
  const [isDraggingRect, setIsDraggingRect] = useState(false)
  
  const { rectangles, selectedId, hydrateRectangles, addRectangle, replaceRectangleId, updateRectangle, selectRectangle } = useRectangles()

  // Load initial rectangles from DB
  useEffect(() => {
    ;(async () => {
      try {
        const items = await loadRectangles()
        hydrateRectangles(items)
      } catch (e) {
        console.error('Failed to load rectangles', e)
      }
    })()
  }, [hydrateRectangles])

  // debounce map per-rectangle
  const pendingUpdateTimers = useRef<Record<string, number>>({})

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

  const handleBackgroundClick = async (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage()
    if (!stage) return

    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const rawX = (pointer.x - stagePos.x) / scale
    const rawY = (pointer.y - stagePos.y) / scale

    const width = Math.max(DEFAULT_RECT_SIZE, MIN_RECT_SIZE)
    const height = Math.max(DEFAULT_RECT_SIZE, MIN_RECT_SIZE)

    // Clamp position so rectangle stays fully within canvas
    const x = clamp(rawX, 0, CANVAS_WIDTH - width)
    const y = clamp(rawY, 0, CANVAS_HEIGHT - height)

    const color = getRectangleColor(currentColorIndex)
    setCurrentColorIndex((idx) => getNextColorIndex(idx))

    const tempId = addRectangle({ x, y, width, height, color })
    // Persist to DB and reconcile ID
    try {
      const { supabase } = await import('../lib/supabase')
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user.id || ''
      const realId = await dbCreateRectangle({ x, y, width, height, color }, userId)
      replaceRectangleId(tempId, realId)
    } catch (err) {
      console.error('Failed to create rectangle in DB', err)
    }
  }

  const handleRectClick = (id: string) => {
    selectRectangle(id)
  }

  const dragBoundWithinCanvas = (width: number, height: number) => (pos: { x: number; y: number }) => {
    // constrain so rectangle's top-left stays within canvas bounds
    const minX = 0
    const maxX = CANVAS_WIDTH - Math.max(20, width)
    const minY = 0
    const maxY = CANVAS_HEIGHT - Math.max(20, height)

    const clampedX = clamp(pos.x, minX, maxX)
    const clampedY = clamp(pos.y, minY, maxY)
    return { x: clampedX, y: clampedY }
  }

  const handleRectDragMove = (id: string) => (e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const newPos = node.position()
    updateRectangle(id, { x: newPos.x, y: newPos.y })
    // debounce DB update
    const handle = pendingUpdateTimers.current[id]
    if (handle) window.clearTimeout(handle)
    const timer = window.setTimeout(async () => {
      try {
        await dbUpdateRectangle(id, { x: newPos.x, y: newPos.y })
      } catch (err) {
        console.error('Failed to update rectangle in DB', err)
      }
    }, 150)
    pendingUpdateTimers.current[id] = timer
  }

  const handleRectDragEnd = (id: string) => (e: KonvaEventObject<DragEvent>) => {
    const node = e.target
    const newPos = node.position()
    updateRectangle(id, { x: newPos.x, y: newPos.y })
    // flush any pending debounce to ensure final position persists
    const handle = pendingUpdateTimers.current[id]
    if (handle) {
      window.clearTimeout(handle)
    }
    ;(async () => {
      try {
        await dbUpdateRectangle(id, { x: newPos.x, y: newPos.y })
      } catch (err) {
        console.error('Failed to persist drag end update', err)
      }
    })()
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
        draggable={!isDraggingRect && (hasHorizontalOverflow || hasVerticalOverflow)}
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
          {/* Background rect to capture clicks on empty canvas */}
          <Rect
            x={0}
            y={0}
            width={layerSize.width}
            height={layerSize.height}
            fill={'#000'}
            opacity={0}
             onClick={handleBackgroundClick}
          />
          <Group listening={false}>{gridLines}</Group>
          {/* Debug visuals: canvas bounds and viewport info */}
          <Rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            stroke="#94a3b8"
            strokeWidth={1}
            listening={false}
          />
          <Text
            x={8}
            y={8}
            text={`scale: ${scale.toFixed(2)} | stage: (${stagePos.x.toFixed(0)}, ${stagePos.y.toFixed(0)})`}
            fontSize={14}
            fill="#64748b"
            listening={false}
          />
          {rectangles.map((r) => (
            <Rectangle
              key={r.id}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              color={r.color}
              selected={selectedId === r.id}
              draggable
              dragBoundFunc={dragBoundWithinCanvas(r.width, r.height)}
              onMouseDown={(e) => {
                e.cancelBubble = true
                setIsDraggingRect(true)
              }}
              onMouseUp={(e) => {
                e.cancelBubble = true
                setIsDraggingRect(false)
              }}
              onDragStart={(e) => {
                e.cancelBubble = true
                setIsDraggingRect(true)
              }}
              onDragMove={handleRectDragMove(r.id)}
              onDragEnd={(e) => {
                setIsDraggingRect(false)
                handleRectDragEnd(r.id)(e)
              }}
              onClick={() => handleRectClick(r.id)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  )
}



