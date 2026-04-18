'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function getPasswordStrength(password: string): 'weak' | 'ok' | 'strong' {
  if (password.length < 8) return 'weak'
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)
  const score = [hasLower, hasUpper, hasNumber, hasSymbol].filter(Boolean).length
  if (score >= 3) return 'strong'
  if (score >= 2) return 'ok'
  return 'weak'
}

const strengthConfig = {
  weak: { label: 'Weak', color: '#ef4444', width: '33%' },
  ok: { label: 'Ok', color: '#f59e0b', width: '66%' },
  strong: { label: 'Strong', color: 'var(--color-success)', width: '100%' },
}

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false })
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = password ? getPasswordStrength(password) : null

  const isFormValid =
    email.length > 0 &&
    password.length >= 8 &&
    confirmPassword === password &&
    !emailError

  const handleBlur = (field: 'email' | 'password' | 'confirmPassword') => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    if (field === 'confirmPassword' && confirmPassword && confirmPassword !== password) {
      setConfirmError('Passwords do not match.')
    } else if (field === 'confirmPassword') {
      setConfirmError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setLoading(true)
    setEmailError('')
    setPasswordError('')

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setLoading(false)
      if (error.message.toLowerCase().includes('email')) {
        setEmailError(error.message)
      } else {
        setPasswordError(error.message)
      }
      return
    }

    router.push('/signup/client/verify')
  }

  const fieldStyle = (hasError: boolean, isTouched: boolean) => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: `1.5px solid ${hasError && isTouched ? '#ef4444' : 'var(--color-border)'}`,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
  })

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4 max-w-lg mx-auto w-full">
        <span
          className="text-2xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-primary)' }}
        >
          Heidi
        </span>
        <span
          className="text-sm font-medium px-3 py-1 rounded-full"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
          }}
        >
          2 of 4
        </span>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-start px-6 pt-8 pb-16">
        <div className="max-w-sm w-full">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
          >
            Create your account.
          </h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>
            Already have one?{' '}
            <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                style={fieldStyle(!!emailError, touched.email)}
                placeholder="you@example.com"
              />
              {emailError && touched.email && (
                <p className="text-sm mt-1.5" style={{ color: '#ef4444' }}>{emailError}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                style={fieldStyle(!!passwordError, touched.password)}
                placeholder="At least 8 characters"
              />
              {/* Strength bar */}
              {password.length > 0 && strength && (
                <div className="mt-2">
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--color-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: strengthConfig[strength].width,
                        backgroundColor: strengthConfig[strength].color,
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1" style={{ color: strengthConfig[strength].color }}>
                    {strengthConfig[strength].label}
                  </p>
                </div>
              )}
              {passwordError && touched.password && (
                <p className="text-sm mt-1.5" style={{ color: '#ef4444' }}>{passwordError}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium mb-1.5"
                style={{ color: 'var(--color-text)' }}
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  if (touched.confirmPassword && e.target.value !== password) {
                    setConfirmError('Passwords do not match.')
                  } else {
                    setConfirmError('')
                  }
                }}
                onBlur={() => handleBlur('confirmPassword')}
                style={fieldStyle(!!confirmError, touched.confirmPassword)}
                placeholder="Re-enter your password"
              />
              {confirmError && touched.confirmPassword && (
                <p className="text-sm mt-1.5" style={{ color: '#ef4444' }}>{confirmError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className="w-full py-4 rounded-xl text-base font-semibold transition-opacity"
              style={{
                backgroundColor: isFormValid ? 'var(--color-primary)' : 'var(--color-border)',
                color: isFormValid ? '#FBF7F2' : 'var(--color-text-muted)',
                cursor: isFormValid && !loading ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Creating account…' : 'Continue'}
            </button>
          </form>

          <p className="text-xs text-center mt-8" style={{ color: 'var(--color-text-muted)' }}>
            Not therapy. Not dating. Not sexual services.
          </p>
        </div>
      </main>
    </div>
  )
}
