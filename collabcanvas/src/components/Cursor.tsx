type CursorProps = {
  x: number
  y: number
  color: string
  label: string
}

export function Cursor({ x, y, color, label }: CursorProps) {
  return (
    <div
      className="canvas-cursor"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <svg
        className="canvas-cursor__icon"
        viewBox="0 0 24 32"
        role="presentation"
        aria-hidden
      >
        <path
          d="M4 2.5L18.5 17l-6.4 1.7 1.8 9.4-4.3-7.2-4.9 4.6z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="canvas-cursor__label"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
    </div>
  )
}

