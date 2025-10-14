import { Stage, Layer, Line, Group, Rect, Text } from 'react-konva'
import { useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import type { KonvaEventObject } from 'konva/lib/Node'
import { getColorForUserId } from '../lib/colors'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import Cursor from './Cursor'
import PresencePanel from './PresencePanel'

const CANVAS_WIDTH = 3000
const CANVAS_HEIGHT = 3000
const GRID_SIZE = 50
// rectangles removed; keep canvas bounds and grid only


function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function Canvas() {
  const [stageSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; color: string; label: string; ts: number }>>({})
  const [onlineUsers, setOnlineUsers] = useState<Record<string, { label: string; color: string }>>({})
  
  const log = (...args: unknown[]) => console.log('[Canvas]', ...args)

  // rectangles removed: no initial load

  // rectangles removed: no realtime object updates

  // rectangles removed: no reload on online

  // Presence channel
  useEffect(() => {
    let presenceChannel: RealtimeChannel | null = null
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const me = data.session?.user
      if (!me) return

      const metadata = { id: me.id, label: me.email || me.id, color: getColorForUserId(me.id) }
      presenceChannel = supabase.channel('presence-users', {
        config: { presence: { key: me.id } },
      })

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel?.presenceState() || {}
          const users: Record<string, { label: string; color: string }> = {}
          for (const [key, metas] of Object.entries(state) as [string, any[]][]) {
            const last = metas[metas.length - 1]
            if (!last) continue
            users[key] = { label: last.label as string, color: last.color as string }
          }
          setOnlineUsers(users)
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel?.track(metadata)
          }
        })
    })()

    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel)
    }
  }, [])

  // rectangles removed: no debounced updates

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

  // Broadcast local cursor position when on canvas
  useEffect(() => {
    let interval: number | null = null
    let channel: RealtimeChannel | null = null
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const me = data.session?.user
      if (!me) return

      channel = supabase.channel('cursors-broadcast', { config: { broadcast: { ack: true } } })
      await channel.subscribe()

      const color = getColorForUserId(me.id)
      const label = me.email || me.id

      const send = (x: number, y: number) => {
        channel?.send({
          type: 'broadcast',
          event: 'cursor',
          payload: { userId: me.id, x, y, label, color, ts: Date.now() },
        })
      }

      const onMove = (e: MouseEvent) => {
        // convert screen coords to canvas coords (viewport space)
        const x = e.clientX
        const y = e.clientY
        // throttle at ~30ms
        if (interval !== null) return
        interval = window.setTimeout(() => {
          interval = null
          send(x, y)
        }, 30)
      }

      window.addEventListener('mousemove', onMove)

      // Receive others' cursors
      channel.on('broadcast', { event: 'cursor' }, (payload) => {
        const p = payload.payload as any
        if (!p || !p.userId || p.userId === me.id) return
        setRemoteCursors((prev) => ({
          ...prev,
          [p.userId]: { x: p.x, y: p.y, color: p.color, label: p.label, ts: p.ts },
        }))
      })

      // Cleanup stale cursors every 5s
      const cleaner = window.setInterval(() => {
        const now = Date.now()
        setRemoteCursors((prev) => {
          const next: typeof prev = {}
          for (const [k, v] of Object.entries(prev)) {
            if (now - v.ts < 5000) next[k] = v
          }
          return next
        })
      }, 5000)

      return () => {
        window.removeEventListener('mousemove', onMove)
        if (interval !== null) window.clearTimeout(interval)
        window.clearInterval(cleaner)
        if (channel) supabase.removeChannel(channel)
      }
    })()

    return () => {}
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

    log('wheel zoom', { oldScale, newScale, pointer, mousePointTo, newPos, clampedPos })

    setScale(newScale)
    setStagePos(clampedPos)
  }

  // rectangles removed: no background click create

  // rectangles removed

  // rectangles removed

  // rectangles removed

  // rectangles removed

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        dragDistance={3}
        draggable={isPanning && (hasHorizontalOverflow || hasVerticalOverflow)}
        dragBoundFunc={(pos) => ({
          x: clamp(pos.x, minX, maxX),
          y: clamp(pos.y, minY, maxY),
        })}
        onDragMove={(e) => {
          const p = e.target.position()
          setStagePos({ x: p.x, y: p.y })
          log('stage drag move', { stagePos: { x: p.x, y: p.y } })
        }}
        onWheel={handleWheel}
        onMouseUp={() => setIsPanning(false)}
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
            onMouseDown={() => {
              setIsPanning(true)
              log('background mousedown → start panning')
            }}
            onMouseUp={() => {
              setIsPanning(false)
              log('background mouseup → stop panning')
            }}
            // rectangles removed - click does nothing now
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
          {/* rectangles removed */}
        </Layer>
      </Stage>
      {/* Remote Cursors overlay */}
      {Object.entries(remoteCursors).map(([userId, c]) => (
        <Cursor key={userId} x={c.x} y={c.y} color={c.color} label={c.label} />
      ))}
      <PresencePanel
        users={Object.entries(onlineUsers).map(([id, u]) => ({ id, label: u.label, color: u.color }))}
      />
    </div>
  )
}



