import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { Auth } from './components/Auth'
import { Canvas } from './components/Canvas'
import { useAuth } from './contexts/AuthContext'
import { ensureCanvasByName } from './lib/database'

const DEFAULT_CANVAS_NAME = 'default-canvas'

function App() {
  const { user, loading, signOut } = useAuth()
  const [canvasName, setCanvasName] = useState(DEFAULT_CANVAS_NAME)
  const [canvasId, setCanvasId] = useState<string | null>(null)
  const [resolvingCanvas, setResolvingCanvas] = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const params = new URLSearchParams(window.location.search)
    const paramName = params.get('canvas') ?? params.get('canvas_name')
    const name =
      paramName && paramName.trim().length > 0
        ? paramName.trim()
        : DEFAULT_CANVAS_NAME
    setCanvasName(name)

    if (!params.get('canvas')) {
      params.set('canvas', name)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState(null, '', newUrl)
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setCanvasId(null)
      setResolvingCanvas(false)
      setCanvasError(null)
      return
    }

    let cancelled = false
    const resolve = async () => {
      setResolvingCanvas(true)
      setCanvasError(null)
      try {
        const canvas = await ensureCanvasByName(canvasName)
        if (!cancelled) {
          setCanvasId(canvas.id)
        }
      } catch (error) {
        if (!cancelled) {
          setCanvasError(
            error instanceof Error
              ? error.message
              : 'Unable to load canvas metadata.',
          )
        }
      } finally {
        if (!cancelled) {
          setResolvingCanvas(false)
        }
      }
    }

    void resolve()

    return () => {
      cancelled = true
    }
  }, [canvasName, user])

  const isReady = useMemo(
    () => !loading && !!user && !resolvingCanvas && Boolean(canvasId),
    [loading, resolvingCanvas, user, canvasId],
  )

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

  if (canvasError) {
    return (
      <div className="app-error">
        <div className="app-error__content">
          <h2>Unable to load canvas</h2>
          <p>{canvasError}</p>
          <button
            type="button"
            className="app-error__retry"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="app-loading">
        <div className="app-loading__content">
          <div className="app-loading__spinner" aria-hidden />
          <p>Setting up your canvas...</p>
        </div>
      </div>
    )
  }

  const displayName =
    user.user_metadata?.full_name ??
    user.email ??
    user.user_metadata?.user_name ??
    'Account'

  if (!canvasId) {
    return null
  }

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
        <Canvas canvasId={canvasId} />
      </div>
    </div>
  )
}

export default App
