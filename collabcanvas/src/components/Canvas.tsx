import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Layer, Line, Rect, Stage } from 'react-konva'
import type { RealtimeChannel, User } from '@supabase/supabase-js'
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
import { Cursor } from './Cursor'
import { PresencePanel, type PresenceUser } from './PresencePanel'

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

const hashString = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }
  return Math.abs(hash)
}

const getColorForUser = (userId: string | null | undefined) => {
  if (!userId) {
    return RECT_COLORS[0]
  }
  const hash = hashString(userId)
  return RECT_COLORS[hash % RECT_COLORS.length]
}

const getUserDisplayName = (user: User | null | undefined) =>
  user?.user_metadata?.full_name ??
  user?.email ??
  user?.user_metadata?.user_name ??
  'Anonymous'

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

type RemoteCursor = {
  userId: string
  name: string
  color: string
  x: number
  y: number
  updatedAt: number
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
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>(
    {},
  )
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([])

  const pointerOriginRef = useRef({ x: 0, y: 0 })
  const stageOriginRef = useRef({ x: 0, y: 0 })
  const hasMovedRef = useRef(false)
  const cursorChannelRef = useRef<RealtimeChannel | null>(null)
  const channelReadyRef = useRef(false)
  const lastCursorSentRef = useRef(0)
  const cursorVisibleRef = useRef(false)

  const displayName = useMemo(() => getUserDisplayName(user), [user])
  const localCursorColor = useMemo(
    () => getColorForUser(user?.id),
    [user?.id],
  )

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
    if (!user) {
      setPresenceUsers([])
      setRemoteCursors({})
      cursorChannelRef.current = null
      channelReadyRef.current = false
      return
    }

    const channel = supabase.channel(`canvas:${canvasId}:collab`, {
      config: {
        presence: { key: user.id },
        broadcast: { self: false },
      },
    })

    cursorChannelRef.current = channel
    channelReadyRef.current = false

    type PresenceMeta = {
      userId: string
      name: string
      color: string
    }

    const syncPresenceState = () => {
      const state = channel.presenceState<PresenceMeta>()
      const unique = new Map<string, PresenceUser>()
      Object.entries(state).forEach(([key, sessions]) => {
        sessions.forEach((session) => {
          if (!session) {
            return
          }
          const id = session.userId ?? key
          if (!unique.has(id)) {
            unique.set(id, {
              id,
              name: session.name ?? getUserDisplayName(null),
              color: session.color ?? getColorForUser(id),
              isSelf: id === user.id,
            })
          }
        })
      })
      const next = Array.from(unique.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      )
      setPresenceUsers(next)
    }

    const handleCursorBroadcast = (payload: {
      payload: unknown
    }) => {
      const data = payload.payload as {
        userId?: string
        name?: string
        color?: string
        x?: number
        y?: number
        visible?: boolean
        timestamp?: number
      }
      const userId = data?.userId
      if (!userId || userId === user.id) {
        return
      }
      setRemoteCursors((current) => {
        const next = { ...current }
        if (data.visible === false || data.x === undefined || data.y === undefined) {
          if (next[userId]) {
            delete next[userId]
          }
          return next
        }
        next[userId] = {
          userId,
          name: data.name ?? 'Collaborator',
          color: data.color ?? getColorForUser(userId),
          x: data.x,
          y: data.y,
          updatedAt:
            typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
        }
        return next
      })
    }

    channel
      .on('broadcast', { event: 'cursor' }, handleCursorBroadcast)
      .on('presence', { event: 'sync' }, syncPresenceState)
      .on('presence', { event: 'join' }, syncPresenceState)
      .on('presence', { event: 'leave' }, (payload) => {
        const key =
          (payload as { key?: string } | undefined)?.key ??
          (payload as { userId?: string } | undefined)?.userId ??
          null
        if (key) {
          setRemoteCursors((current) => {
            if (!current[key]) {
              return current
            }
            const next = { ...current }
            delete next[key]
            return next
          })
        }
        syncPresenceState()
      })

    channel.subscribe((status) => {
      log('Collab channel status', status)
      if (status === 'SUBSCRIBED') {
        channelReadyRef.current = true
        void channel.track({
          userId: user.id,
          name: displayName,
          color: localCursorColor,
        })
      }
      if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        channelReadyRef.current = false
      }
    })

    return () => {
      if (channelReadyRef.current) {
        void channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: user.id,
            visible: false,
            timestamp: Date.now(),
          },
        })
      }
      channelReadyRef.current = false
      cursorChannelRef.current = null
      setRemoteCursors((current) => {
        const next = { ...current }
        delete next[user.id]
        return next
      })
      setPresenceUsers((current) =>
        current.filter((presence) => presence.id !== user.id),
      )
      supabase.removeChannel(channel)
    }
  }, [canvasId, displayName, localCursorColor, user])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemoteCursors((current) => {
        const now = Date.now()
        let changed = false
        const next: Record<string, RemoteCursor> = {}
        Object.entries(current).forEach(([key, cursor]) => {
          if (now - cursor.updatedAt <= 5000) {
            next[key] = cursor
          } else {
            changed = true
          }
        })
        return changed ? next : current
      })
    }, 2000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

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

  const remoteCursorPositions = useMemo(() => {
    const entries = Object.values(remoteCursors)
    return entries
      .map((cursor) => {
        const screenX = stagePosition.x + cursor.x * scale
        const screenY = stagePosition.y + cursor.y * scale
        const isVisible =
          screenX >= -80 &&
          screenX <= viewportSize.width + 80 &&
          screenY >= -80 &&
          screenY <= viewportSize.height + 80
        return {
          ...cursor,
          screenX,
          screenY,
          isVisible,
        }
      })
      .filter((cursor) => cursor.isVisible)
  }, [remoteCursors, scale, stagePosition.x, stagePosition.y, viewportSize.height, viewportSize.width])

  const broadcastCursorPosition = useCallback(
    (position: { x: number; y: number } | null) => {
      const channel = cursorChannelRef.current
      if (!channel || !channelReadyRef.current || !user) {
        return
      }

      if (position) {
        const now = performance.now()
        if (cursorVisibleRef.current && now - lastCursorSentRef.current < 30) {
          return
        }
        lastCursorSentRef.current = now
        cursorVisibleRef.current = true
        void channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: user.id,
            name: displayName,
            color: localCursorColor,
            x: position.x,
            y: position.y,
            visible: true,
            timestamp: Date.now(),
          },
        })
      } else if (cursorVisibleRef.current) {
        cursorVisibleRef.current = false
        lastCursorSentRef.current = 0
        void channel.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId: user.id,
            visible: false,
            timestamp: Date.now(),
          },
        })
      }
    },
    [displayName, localCursorColor, user],
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

  const handlePointerMove = useCallback(
    (event: KonvaEventObject<any>) => {
      const stage = event.target.getStage()
      const pointer = getCanvasPointer(stage)
      if (!stage) {
        return
      }
      if (
        pointer &&
        pointer.x >= 0 &&
        pointer.x <= WORKSPACE_SIZE &&
        pointer.y >= 0 &&
        pointer.y <= WORKSPACE_SIZE
      ) {
        broadcastCursorPosition(pointer)
      } else {
        broadcastCursorPosition(null)
      }
    },
    [broadcastCursorPosition],
  )

  const handlePointerLeave = useCallback(() => {
    broadcastCursorPosition(null)
  }, [broadcastCursorPosition])

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

      const stage = event.target.getStage()
      const pointer = getCanvasPointer(stage)
      if (pointer) {
        broadcastCursorPosition(pointer)
      }

      hasMovedRef.current = false
      pointerOriginRef.current = clientPoint
      stageOriginRef.current = stagePosition
      setIsPanning(true)
    },
    [broadcastCursorPosition, stagePosition],
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

  const handleStageMouseMove = useCallback(
    (event: KonvaEventObject<MouseEvent | TouchEvent>) => {
      handlePointerMove(event)
      handlePanMove(event)
    },
    [handlePanMove, handlePointerMove],
  )

  const handleStageTouchMove = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      handlePointerMove(event)
      handlePanMove(event)
    },
    [handlePanMove, handlePointerMove],
  )

  const handleStageMouseUp = useCallback(
    (event: KonvaEventObject<MouseEvent>) => {
      handlePanEnd(event)
      handlePointerMove(event)
    },
    [handlePanEnd, handlePointerMove],
  )

  const handleStageTouchEnd = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      handlePanEnd(event)
      handlePointerLeave()
    },
    [handlePanEnd, handlePointerLeave],
  )

  const handleStageTouchCancel = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      handlePanEnd(event)
      handlePointerLeave()
    },
    [handlePanEnd, handlePointerLeave],
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
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onTouchStart={handlePanStart}
        onTouchMove={handleStageTouchMove}
        onTouchEnd={handleStageTouchEnd}
        onTouchCancel={handleStageTouchCancel}
        onMouseLeave={handlePointerLeave}
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
      <div className="canvas-cursors-layer">
        {remoteCursorPositions.map((cursor) => (
          <Cursor
            key={cursor.userId}
            x={cursor.screenX}
            y={cursor.screenY}
            color={cursor.color}
            label={cursor.name}
          />
        ))}
      </div>
      <PresencePanel users={presenceUsers} />
    </div>
  )
}
