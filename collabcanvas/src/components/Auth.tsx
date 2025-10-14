import type { ReactElement } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth(): ReactElement {

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
      }}
    >
      <div
        style={{
          width: 360,
          maxWidth: '90vw',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          padding: 24,
        }}
      >
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>CollabCanvas</h1>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#475569' }}>
          Sign in to start collaborating
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={async () => {
              await supabase.auth.signInWithOAuth({
                provider: 'google',
              })
            }}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: '#111827',
              fontSize: 16,
              fontWeight: 600,
              minHeight: 44,
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="12" cy="12" r="9" stroke="#4285F4" strokeWidth="3" fill="none" />
              <rect x="12" y="5" width="8" height="8" fill="white" />
              <line x1="12" y1="12" x2="19" y2="12" stroke="#4285F4" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  )
}


