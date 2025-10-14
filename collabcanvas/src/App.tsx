import { useEffect, useState } from 'react'
import Canvas from './components/Canvas'
import Auth from './components/Auth'
import { supabase } from './lib/supabase'

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']

function App() {
  const [session, setSession] = useState<Session>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
    })()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#64748b' }}>Loading…</span>
      </div>
    )
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div
        style={{
          position: 'fixed',
          top: 8,
          right: 8,
          zIndex: 10,
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          background: 'rgba(15,23,42,0.6)',
          color: 'white',
          padding: '6px 10px',
          borderRadius: 8,
          backdropFilter: 'blur(6px)',
        }}
      >
        <span style={{ fontSize: 12 }}>{session.user.email || session.user.id}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{
            fontSize: 12,
            background: '#ef4444',
            color: 'white',
            border: 0,
            borderRadius: 6,
            padding: '6px 8px',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
      <Canvas />
    </div>
  )
}

export default App
