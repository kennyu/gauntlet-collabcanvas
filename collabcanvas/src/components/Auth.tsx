import { Auth as SupabaseAuth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabase'

export function Auth() {
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1>CollabCanvas</h1>
          <p>Sign in to collaborate in real time.</p>
        </div>
        <SupabaseAuth
          supabaseClient={supabase}
          providers={['google', 'github']}
          redirectTo={redirectTo}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8',
                },
              },
            },
          }}
        />
      </div>
    </div>
  )
}
