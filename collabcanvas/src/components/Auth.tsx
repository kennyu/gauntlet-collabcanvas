import { type FormEvent, useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined

  const toggleMode = () => {
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'))
    setErrorMessage(null)
    setInfoMessage(null)
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) {
      return
    }
    setErrorMessage(null)
    setInfoMessage(null)

    if (mode === 'signUp' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) {
          throw error
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: redirectTo
            ? { emailRedirectTo: redirectTo }
            : undefined,
        })
        if (error) {
          throw error
        }
        if (!data.session) {
          setInfoMessage('Check your inbox to confirm your email before signing in.')
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Something went wrong while signing in.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1>CollabCanvas</h1>
          <p>Sign in to collaborate in real time.</p>
        </div>
        <div className="auth-card__form-wrapper">
          <h2 className="auth-card__form-title">
            {mode === 'signIn' ? 'Sign in with email' : 'Create an account'}
          </h2>
          <form className="auth-card__form" onSubmit={handleSubmit}>
            <label className="auth-card__field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete={mode === 'signUp' ? 'email' : 'username'}
                disabled={submitting}
              />
            </label>
            <label className="auth-card__field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                disabled={submitting}
              />
            </label>
            {mode === 'signUp' ? (
              <label className="auth-card__field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </label>
            ) : null}
            <button
              type="submit"
              className="auth-card__submit"
              disabled={submitting}
            >
              {submitting
                ? mode === 'signIn'
                  ? 'Signing in...'
                  : 'Creating account...'
                : mode === 'signIn'
                  ? 'Sign in'
                  : 'Sign up'}
            </button>
          </form>
          <button
            type="button"
            className="auth-card__toggle"
            onClick={toggleMode}
            disabled={submitting}
          >
            {mode === 'signIn'
              ? "Need an account? Sign up instead."
              : 'Have an account? Sign in instead.'}
          </button>
        </div>
        {infoMessage ? (
          <p role="status" className="auth-card__info">
            {infoMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p role="alert" className="auth-card__error">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}
