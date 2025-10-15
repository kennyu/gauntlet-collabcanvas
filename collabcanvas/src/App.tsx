import './App.css'
import { Auth } from './components/Auth'
import { Canvas } from './components/Canvas'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { user, loading, signOut } = useAuth()

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__content">
          <div className="app-loading__spinner" aria-hidden />
          <p>Preparing your workspace...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Auth />
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.email ??
    user.user_metadata?.user_name ??
    'Account'

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-header__title">CollabCanvas</span>
        <div className="app-header__session">
          <span className="app-header__user">{displayName}</span>
          <button
            type="button"
            className="app-header__signout"
            onClick={() => {
              void signOut()
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="app-content">
        <Canvas />
      </div>
    </div>
  )
}

export default App
