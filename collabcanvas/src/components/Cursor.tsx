import type { ReactElement } from 'react'

type Props = {
  x: number
  y: number
  color: string
  label: string
}

export default function Cursor({ x, y, color, label }: Props): ReactElement {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-2px, -2px)',
        pointerEvents: 'none',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 3l14 7-6 2-2 6-6-15z" fill={color} />
        <path d="M4 3l14 7" stroke="#0f172a" opacity={0.2} />
      </svg>
      <span
        style={{
          background: color,
          color: 'white',
          borderRadius: 6,
          padding: '2px 6px',
          fontSize: 11,
          lineHeight: '14px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}


