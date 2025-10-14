import type { ReactElement } from 'react'

type UserPresence = { id: string; label: string; color: string }

export default function PresencePanel({ users }: { users: UserPresence[] }): ReactElement {
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        left: 8,
        zIndex: 15,
        background: 'rgba(15,23,42,0.6)',
        color: 'white',
        padding: '8px 10px',
        borderRadius: 8,
        backdropFilter: 'blur(6px)',
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>Online ({users.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: u.color,
                display: 'inline-block',
              }}
            />
            <span>{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


