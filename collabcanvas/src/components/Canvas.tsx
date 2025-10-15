import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage as KonvaStage } from 'konva/lib/Stage'
import { Rectangle, type CanvasRectangle } from './Rectangle'
import { useAuth } from '../contexts/AuthContext'
import {
  createRectangle,
  loadRectangles,
  updateRectangle,
  type RectangleRecord,
} from '../lib/database'
import { supabase } from '../lib/supabase'

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

const mapRecordToRectangle = (
  record: RectangleRecord,
  fallbackCanvasId?: string,
): CanvasRectangle => ({
  id: record.id,
  x: record.x,
  y: record.y,
  width: record.width,
  height: record.height,
  color: record.color,
  canvasId: record.canvas_id ?? fallbackCanvasId ?? '',
  updatedAt: record.updated_at ?? record.created_at ?? null,
})

const parseTimestamp = (value: string | null | undefined) =>
  value ? Date.parse(value) || 0 : 0

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.log('[CanvasSync]', ...args)
}

type CanvasProps = {
  canvasId: string
}

export function Canvas({ canvasId }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { user } = useAuth()
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [scale, setScale] = useState(1)
  const [rectangles, setRectangles] = useState<CanvasRectangle[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const stageOriginRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

  useEffect(() => {
    const fetchRectangles = async () => {
      log('Loading rectangles from database', { canvasId })
      const records = await loadRectangles(canvasId)
      log('Loaded rectangles response', records.length)
      setRectangles(records.map((record) => mapRecordToRectangle(record, canvasId)))
    }

    void fetchRectangles()
  }, [canvasId])

  useEffect(() => {
    const channel = supabase.channel(`canvas:${canvasId}:objects`)

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'canvas_objects',
        filter: `canvas_id=eq.${canvasId}`,
      },
      (payload) => {
        const eventType = payload.eventType
        log('Realtime change received', eventType, {
          new: payload.new,
          old: payload.old,
        })

        if (eventType === 'DELETE') {
          const record = payload.old as RectangleRecord | undefined
          if (!record?.id) {
            log('Delete payload missing record id')
            return
          }
          setRectangles((current) =>
            current.filter((item) => item.id !== record.id),
          )
          return
        }

        const record = payload.new as RectangleRecord | undefined
        if (!record) {
          log('Change payload missing record')
          return
        }

        const incoming = mapRecordToRectangle(record, canvasId)
        setRectangles((current) => {
          const existingIndex = current.findIndex((item) => item.id === incoming.id)
          if (existingIndex === -1) {
            return [...current, incoming].sort(
              (a, b) => parseTimestamp(a.updatedAt) - parseTimestamp(b.updatedAt),
            )
          }

          const existing = current[existingIndex]
          const existingTs = parseTimestamp(existing.updatedAt)
          const incomingTs = parseTimestamp(incoming.updatedAt)
          if (incomingTs < existingTs) {
            log('Ignoring stale change', {
              id: incoming.id,
              existingTs,
              incomingTs,
            })
            return current
          }
          const next = [...current]
          next[existingIndex] = incoming
          return next.sort(
            (a, b) => parseTimestamp(a.updatedAt) - parseTimestamp(b.updatedAt),
          )
        })
      },
    )

    channel.subscribe((status) => {
      log('Realtime channel status', status)
    })

    return () => {
      log('Removing realtime channel', { canvasId })
      supabase.removeChannel(channel)
    }
  }, [canvasId])

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

  const computePanBounds = useCallback(
    (nextScale = scale) => {
      const scaledWidth = WORKSPACE_SIZE * nextScale
      const scaledHeight = WORKSPACE_SIZE * nextScale

      const extraX = viewportSize.width - scaledWidth
      const extraY = viewportSize.height - scaledHeight

      const minX = extraX >= 0 ? extraX / 2 : viewportSize.width - scaledWidth
      const maxX = extraX >= 0 ? extraX / 2 : 0
      const minY = extraY >= 0 ? extraY / 2 : viewportSize.height - scaledHeight
      const maxY = extraY >= 0 ? extraY / 2 : 0

      return { minX, maxX, minY, maxY }
    },
    [scale, viewportSize.height, viewportSize.width],
  )

  const clampStagePosition = useCallback(
    (next: { x: number; y: number }, nextScale = scale) => {
      const bounds = computePanBounds(nextScale)
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, next.x))
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, next.y))
      return { x: clampedX, y: clampedY }
    },
    [computePanBounds, scale],
  )

  useEffect(() => {
    setStagePosition((current) => clampStagePosition(current))
  }, [clampStagePosition])

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

  const clampRectanglePosition = useCallback((
    rectangle: CanvasRectangle,
    position: { x: number; y: number },
  ) => ({
    x: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.width, position.x)),
    y: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.height, position.y)),
  }), [])

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
      const tempId = `temp-${Math.random().toString(36).slice(2)}`
      const optimisticRectangle: CanvasRectangle = {
        id: tempId,
        x: clampedX,
        y: clampedY,
        width,
        height,
        color,
        canvasId,
        updatedAt: new Date().toISOString(),
      }

      setRectangles((current) => [...current, optimisticRectangle])
      setSelectedId(tempId)

      setColorIndex((index) => (index + 1) % RECT_COLORS.length)

      void createRectangle({
        x: clampedX,
        y: clampedY,
        width,
        height,
        color,
        canvas_id: canvasId,
        created_by: user?.id ?? null,
      }).then((record) => {
        setRectangles((current) =>
          current.map((item) =>
            item.id === tempId
              ? mapRecordToRectangle(record, canvasId)
              : item,
          ),
        )
        setSelectedId(record.id)
      })
    },
    [canvasId, colorIndex, user?.id],
  )

  const updateRectanglePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      let clamped: { x: number; y: number } | undefined
      setRectangles((current) =>
        current.map((item) => {
          if (item.id !== id) {
            return item
          }
          clamped = clampRectanglePosition(item, position)
          return {
            ...item,
            ...clamped,
            updatedAt: new Date().toISOString(),
          }
        }),
      )
      return clamped
    },
    [clampRectanglePosition],
  )

  const persistRectanglePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      void updateRectangle(id, {
        id,
        x: position.x,
        y: position.y,
        canvas_id: canvasId,
        updated_at: new Date().toISOString(),
      })
    },
    [canvasId],
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

      if (selectedId) {
        setSelectedId(null)
        hasMovedRef.current = false
        return
      }

      createRectangleAt(pointer)
      hasMovedRef.current = false
    },
    [createRectangleAt, isPanning, selectedId],
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
              <Rectangle
                key={rectangle.id}
                rectangle={rectangle}
                isSelected={rectangle.id === selectedId}
                onSelect={() => setSelectedId(rectangle.id)}
                onDragMove={(event) =>
                  clampRectanglePosition(rectangle, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                }
                onDragEnd={(event) => {
                  const clamped = updateRectanglePosition(rectangle.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                  if (clamped && !rectangle.id.startsWith('temp-')) {
                    persistRectanglePosition(rectangle.id, clamped)
                  }
                  return clamped
                }}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
