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
  ACTIVE_CANVAS_ID,
  createRectangle as createRectangleRecord,
  loadRectangles,
  updateRectangle as updateRectangleRecord,
  type CanvasObjectRow,
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

const debugLog = (...args: unknown[]) => {
  console.log('[CanvasSync]', ...args)
}

const generateRectangleId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const timestampOrZero = (value: string | null) => {
  if (!value) {
    return 0
  }
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const sortRectangles = (items: CanvasRectangle[]) =>
  [...items].sort((a, b) => {
    const diff =
      timestampOrZero(a.createdAt) - timestampOrZero(b.createdAt)
    if (diff !== 0) {
      return diff
    }
    return a.id.localeCompare(b.id)
  })

const mapRowToRectangle = (row: CanvasObjectRow): CanvasRectangle => {
  const createdAt = row.created_at ?? row.updated_at ?? null
  const updatedAt = row.updated_at ?? row.created_at ?? null
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    color: row.color,
    createdAt,
    updatedAt,
    createdBy: row.created_by,
    canvasId: row.canvas_id ?? ACTIVE_CANVAS_ID,
  }
}

export function Canvas() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const containerRef = useRef<HTMLDivElement | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const hadChannelErrorRef = useRef(false)
  const isMountedRef = useRef(true)

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
    debugLog('Canvas mounted', { userId })
    return () => {
      debugLog('Canvas unmounted')
    }
  }, [userId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      const channel = channelRef.current
      if (channel) {
        void channel.unsubscribe()
        channelRef.current = null
      }
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

  const applyRectangleUpdate = useCallback((incoming: CanvasRectangle) => {
    if (incoming.canvasId !== ACTIVE_CANVAS_ID) {
      debugLog('Ignoring update for foreign canvas', incoming)
      return
    }
    setRectangles((current) => {
      const index = current.findIndex((item) => item.id === incoming.id)
      if (index === -1) {
        debugLog('Adding rectangle from payload', incoming)
        return sortRectangles([...current, incoming])
      }
      const existing = current[index]
      const incomingTimestamp = timestampOrZero(incoming.updatedAt)
      const existingTimestamp = timestampOrZero(existing.updatedAt)
      if (incomingTimestamp < existingTimestamp) {
        debugLog('Skipping stale rectangle update', {
          incoming,
          incomingTimestamp,
          existingTimestamp,
        })
        return current
      }
      debugLog('Applying rectangle update', incoming)
      const next = [...current]
      next[index] = { ...existing, ...incoming }
      return sortRectangles(next)
    })
  }, [])

  const refreshRectangles = useCallback(async () => {
    try {
      debugLog('Requesting rectangles from database')
      const rows = await loadRectangles()
      if (!isMountedRef.current) {
        return
      }
      const mapped = rows.map(mapRowToRectangle)
      debugLog('Loaded rectangles from database', mapped)
      setRectangles(sortRectangles(mapped))
    } catch (error) {
      debugLog('Failed to load rectangles', error)
      console.error('Failed to load rectangles from Supabase', error)
    }
  }, [])

  useEffect(() => {
    void refreshRectangles()
  }, [refreshRectangles])

  useEffect(() => {
    const computed = rectangles.length % RECT_COLORS.length
    setColorIndex((current) => (current === computed ? current : computed))
  }, [rectangles.length])

  const clampRectanglePosition = useCallback(
    (rectangle: CanvasRectangle, position: { x: number; y: number }) => ({
      x: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.width, position.x)),
      y: Math.max(0, Math.min(WORKSPACE_SIZE - rectangle.height, position.y)),
    }),
    [],
  )
  const commitRectanglePosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      let result:
        | {
            clamped: { x: number; y: number }
            timestamp: string
            canvasId: string
          }
        | undefined
      setRectangles((current) =>
        current.map((item) => {
          if (item.id !== id) {
            return item
          }
          const clamped = clampRectanglePosition(item, position)
          const timestamp = new Date().toISOString()
          const canvasId = item.canvasId ?? ACTIVE_CANVAS_ID
          result = { clamped, timestamp, canvasId }
          return {
            ...item,
            ...clamped,
            updatedAt: timestamp,
            canvasId,
          }
        }),
      )
      if (result) {
        debugLog('Committed rectangle position', { id, ...result })
      } else {
        debugLog('Commit skipped, rectangle not found', { id })
      }
      return result
    },
    [clampRectanglePosition],
  )

  const persistRectanglePosition = useCallback(
    (
      id: string,
      position: { x: number; y: number },
      timestamp: string,
      canvasId: string,
    ) => {
      debugLog('Persisting rectangle position', {
        id,
        position,
        timestamp,
        canvasId,
      })
      void (async () => {
        try {
          const updated = await updateRectangleRecord(id, {
            x: position.x,
            y: position.y,
            updatedAt: timestamp,
            canvasId,
          })
          if (!isMountedRef.current) {
            return
          }
          debugLog('Persisted rectangle update response', updated)
          applyRectangleUpdate(mapRowToRectangle(updated))
        } catch (error) {
          console.error(`Failed to persist rectangle ${id}`, error)
          if (isMountedRef.current) {
            debugLog('Reloading rectangles after failed persist', { id, error })
            void refreshRectangles()
          }
        }
      })()
    },
    [applyRectangleUpdate, refreshRectangles],
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
      const id = generateRectangleId()
      const now = new Date().toISOString()
      const optimisticRectangle: CanvasRectangle = {
        id,
        x: clampedX,
        y: clampedY,
        width,
        height,
        color,
        createdAt: now,
        updatedAt: now,
        createdBy: userId,
        canvasId: ACTIVE_CANVAS_ID,
      }

      debugLog('Creating rectangle optimistically', optimisticRectangle)
      setRectangles((current) => {
        const next = sortRectangles([...current, optimisticRectangle])
        debugLog('Rectangle count after optimistic create', next.length)
        return next
      })
      setSelectedId(id)

      void (async () => {
        try {
          const saved = await createRectangleRecord({
            id,
            x: clampedX,
            y: clampedY,
            width,
            height,
            color,
            createdAt: now,
            updatedAt: now,
            createdBy: userId,
          })
          if (!isMountedRef.current) {
            return
          }
          debugLog('Rectangle persisted to database', saved)
          applyRectangleUpdate(mapRowToRectangle(saved))
        } catch (error) {
          console.error('Failed to create rectangle', error)
          if (!isMountedRef.current) {
            return
          }
          debugLog('Rolling back failed rectangle create', { id })
          setRectangles((current) =>
            current.filter((rectangle) => rectangle.id !== id),
          )
          setSelectedId((current) => (current === id ? null : current))
        }
      })()
    },
    [applyRectangleUpdate, colorIndex, userId],
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

  useEffect(() => {
    debugLog('Setting up realtime channel')
    const channel = supabase
      .channel('realtime-canvas-objects')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'canvas_objects',
        },
        (payload: RealtimePostgresInsertPayload<CanvasObjectRow>) => {
          const row = payload.new
          if (!row || row.type !== 'rectangle') {
            return
          }
          debugLog('Realtime INSERT received', row)
          applyRectangleUpdate(mapRowToRectangle(row))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'canvas_objects',
        },
        (payload: RealtimePostgresUpdatePayload<CanvasObjectRow>) => {
          const row = payload.new
          if (!row || row.type !== 'rectangle') {
            return
          }
          debugLog('Realtime UPDATE received', row)
          applyRectangleUpdate(mapRowToRectangle(row))
        },
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          debugLog('Realtime channel subscribed')
          if (hadChannelErrorRef.current) {
            hadChannelErrorRef.current = false
            void refreshRectangles()
          }
        } else if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          debugLog('Realtime channel issue detected', { status, error: err })
          hadChannelErrorRef.current = true
        }
        if (err) {
          debugLog('Realtime channel error details', err)
        }
      })

    channelRef.current = channel
    debugLog('Realtime channel created', { topic: channel.topic })

    return () => {
      channelRef.current = null
      debugLog('Realtime channel cleanup unsubscribing', { topic: channel.topic })
      void channel.unsubscribe()
    }
  }, [applyRectangleUpdate, refreshRectangles])

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
                onDragMove={(event) => {
                  const clamped = clampRectanglePosition(rectangle, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                  if (
                    clamped.x !== event.target.x() ||
                    clamped.y !== event.target.y()
                  ) {
                    debugLog('Clamping rectangle during drag', {
                      id: rectangle.id,
                      clamped,
                    })
                  }
                  return clamped
                }}
                onDragEnd={(event) => {
                  const result = commitRectanglePosition(rectangle.id, {
                    x: event.target.x(),
                    y: event.target.y(),
                  })
                  if (result) {
                    persistRectanglePosition(
                      rectangle.id,
                      result.clamped,
                      result.timestamp,
                      result.canvasId,
                    )
                    return result.clamped
                  }
                  debugLog('Drag end without committed position', {
                    id: rectangle.id,
                  })
                }}
              />
            ))}
          </Group>
        </Layer>
      </Stage>
    </div>
  )
}
