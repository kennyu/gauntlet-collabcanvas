import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage } from 'react-konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import type { Stage as KonvaStage } from 'konva/lib/Stage'
import type {
  RealtimeChannel,
  RealtimePostgresInsertPayload,
  RealtimePostgresUpdatePayload,
} from '@supabase/supabase-js'
import { Rectangle, type CanvasRectangle } from './Rectangle'
import { useAuth } from '../contexts/AuthContext'
import {
  createRectangle as createRectangleRecord,
  loadRectangles,
  updateRectangle as updateRectangleRecord,
  type RectangleRecord,
} from '../lib/database'
import { realtimeSchema, supabase } from '../lib/supabase'

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
): CanvasRectangle => ({
  id: record.id,
  x: record.x,
  y: record.y,
  width: record.width,
  height: record.height,
  color: record.color,
  canvasId: record.canvas_id,
  updatedAt: record.updated_at ?? record.created_at ?? null,
})

const parseTimestamp = (value: string | null | undefined) =>
  value ? Date.parse(value) || 0 : 0

const generateRectangleId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

type CanvasProps = {
  canvasId?: string
}

export function Canvas({ canvasId = 'default' }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const { user } = useAuth()
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [scale, setScale] = useState(1)
  const [rectangles, setRectangles] = useState<CanvasRectangle[]>([])
  const [colorIndex, setColorIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoadingRectangles, setIsLoadingRectangles] = useState(true)
  const [syncError, setSyncError] = useState<string | null>(null)
  const pendingUpdatesRef = useRef(new Map<string, number>())
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)
  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const stageOriginRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)

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

  const clampRectanglePosition = useCallback(
    (rectangle: CanvasRectangle, position: { x: number; y: number }) => ({
      x: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.width, position.x)),
      y: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.height, position.y)),
    }),
    [],
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
    let cancelled = false
    setIsLoadingRectangles(true)
    setSyncError(null)

    loadRectangles(canvasId)
      .then((records) => {
        if (cancelled) {
          return
        }
        setRectangles(records.map(mapRecordToRectangle))
      })
      .catch((error: Error) => {
        if (cancelled) {
          return
        }
        setSyncError(error.message)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingRectangles(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [canvasId])

  useEffect(() => {
    if (!syncError) {
      return
    }
    const timeoutId = window.setTimeout(() => {
      setSyncError(null)
    }, 5000)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [syncError])

  const handleInsertEvent = useCallback(
    (payload: RealtimePostgresInsertPayload<RectangleRecord>) => {
      const record = payload.new
      if (!record) {
        return
      }
      if (record.canvas_id !== canvasId) {
        return
      }
      setRectangles((current) => {
        const existing = current.find((item) => item.id === record.id)
        const incoming = mapRecordToRectangle(record)
        const incomingTs = parseTimestamp(incoming.updatedAt)

        if (!existing) {
          return [...current, incoming]
        }

        const existingTs = parseTimestamp(existing.updatedAt)
        if (existingTs >= incomingTs) {
          return current
        }

        return current.map((item) =>
          item.id === record.id ? { ...incoming } : item,
        )
      })
      setSyncError(null)
    },
    [canvasId],
  )

  const handleUpdateEvent = useCallback(
    (payload: RealtimePostgresUpdatePayload<RectangleRecord>) => {
      const record = payload.new
      if (!record) {
        return
      }
      if (record.canvas_id !== canvasId) {
        return
      }

      setRectangles((current) => {
        const index = current.findIndex((item) => item.id === record.id)
        const incoming = mapRecordToRectangle(record)
        const incomingTs = parseTimestamp(incoming.updatedAt)

        if (index === -1) {
          return [...current, incoming]
        }

        const existing = current[index]
        const existingTs = parseTimestamp(existing.updatedAt)

        if (existingTs >= incomingTs) {
          return current
        }

        const next = [...current]
        next[index] = incoming
        return next
      })

      if (pendingUpdatesRef.current.has(record.id)) {
        pendingUpdatesRef.current.delete(record.id)
      }
      setSyncError(null)
    },
    [canvasId],
  )

  useEffect(() => {
    const channelName = `canvas-objects-realtime-${canvasId}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: realtimeSchema,
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        handleInsertEvent,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: realtimeSchema,
          table: 'canvas_objects',
          filter: `canvas_id=eq.${canvasId}`,
        },
        handleUpdateEvent,
      )

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setSyncError((current) =>
          current && current.includes('Realtime') ? null : current,
        )
      }
      if (status === 'CHANNEL_ERROR') {
        setSyncError('Realtime connection error. Attempting to reconnect…')
      }
      if (status === 'CLOSED') {
        setSyncError('Realtime connection closed. Attempting to reconnect…')
      }
    })

    realtimeChannelRef.current = channel

    return () => {
      realtimeChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [canvasId, handleInsertEvent, handleUpdateEvent])

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

      const tempId = `temp-${generateRectangleId()}`
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

      void createRectangleRecord({
        x: clampedX,
        y: clampedY,
        width,
        height,
        color,
        canvas_id: canvasId,
        created_by: user?.id ?? null,
      })
        .then((record) => {
          setSyncError(null)
          setRectangles((current) =>
            current.map((item) =>
              item.id === tempId ? mapRecordToRectangle(record) : item,
            ),
          )
          setSelectedId(record.id)
        })
        .catch((error: Error) => {
          setRectangles((current) =>
            current.filter((item) => item.id !== tempId),
          )
          setSelectedId(null)
          setSyncError(error.message)
        })
    },
    [canvasId, colorIndex, user?.id],
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
                  updateRectanglePosition(rectangle.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                }
                onDragEnd={(event) => {
                  const nextPosition = updateRectanglePosition(rectangle.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                  if (
                    nextPosition &&
                    rectangle.id &&
                    !rectangle.id.startsWith('temp-')
                  ) {
                    const pendingTimestamp = Date.now()
                    pendingUpdatesRef.current.set(
                      rectangle.id,
                      pendingTimestamp,
                    )
                    void updateRectangleRecord(rectangle.id, {
                      x: nextPosition.x,
                      y: nextPosition.y,
                      canvas_id: canvasId,
                      updated_at: new Date().toISOString(),
                    })
                      .then((record) => {
                        pendingUpdatesRef.current.delete(rectangle.id)
                        setRectangles((current) =>
                          current.map((item) =>
                            item.id === record.id
                              ? mapRecordToRectangle(record)
                              : item,
                          ),
                        )
                        setSyncError(null)
                      })
                      .catch((error: Error) => {
                        pendingUpdatesRef.current.delete(rectangle.id)
                        setSyncError(error.message)
                      })
                  }
                }}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
      {isLoadingRectangles ? (
        <div className="canvas-overlay">
          <div className="canvas-overlay__content">
            <div className="canvas-overlay__spinner" aria-hidden />
            <span>Loading rectangles…</span>
          </div>
        </div>
      ) : null}
      {syncError ? (
        <div className="canvas-toast" role="status">
          {syncError}
        </div>
      ) : null}
    </div>
  )
}
