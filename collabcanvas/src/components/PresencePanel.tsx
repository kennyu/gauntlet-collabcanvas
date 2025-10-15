export type PresenceUser = {
  id: string
  name: string
  color: string
  isSelf: boolean
}

type PresencePanelProps = {
  users: PresenceUser[]
}

export function PresencePanel({ users }: PresencePanelProps) {
  return (
    <aside className="presence-panel" aria-live="polite">
      <div className="presence-panel__header">
        <span className="presence-panel__title">Online</span>
        <span className="presence-panel__count">{users.length}</span>
      </div>
      <ul className="presence-panel__list">
        {users.length === 0 ? (
          <li className="presence-panel__empty">No collaborators</li>
        ) : (
          users.map((user) => (
            <li key={user.id} className="presence-panel__item">
              <span
                className="presence-panel__dot"
                style={{ backgroundColor: user.color }}
                aria-hidden
              />
              <span className="presence-panel__name">
                {user.name}
                {user.isSelf ? (
                  <span className="presence-panel__you"> (You)</span>
                ) : null}
              </span>
            </li>
          ))
        )}
      </ul>
    </aside>
  )
}

