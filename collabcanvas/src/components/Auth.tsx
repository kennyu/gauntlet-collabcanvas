import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined

  const handleSignIn = async (provider: 'google' | 'github') => {
    setErrorMessage(null)
    setLoadingProvider(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: false,
        },
      })
      if (error) {
        throw error
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Something went wrong while signing in.')
      }
      setLoadingProvider(null)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1>CollabCanvas</h1>
          <p>Sign in to collaborate in real time.</p>
        </div>
        <div className="auth-card__buttons">
          <button
            type="button"
            className="auth-card__button auth-card__button--google"
            onClick={() => handleSignIn('google')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'google' ? 'Redirecting…' : 'Continue with Google'}
          </button>
          <button
            type="button"
            className="auth-card__button auth-card__button--github"
            onClick={() => handleSignIn('github')}
            disabled={loadingProvider !== null}
          >
            {loadingProvider === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="auth-card__error">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}
