'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { createClient } from '@/lib/supabase/client'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      if (
        resetError.message.toLowerCase().includes('not found') ||
        resetError.message.toLowerCase().includes('no user')
      ) {
        setError("We don't have an account with that email.")
      } else {
        // Supabase doesn't always reveal whether an email exists for security.
        // Show success state to avoid email enumeration.
        setSubmitted(true)
      }
      return
    }

    setSubmitted(true)
  }

  const fieldStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: `1.5px solid ${error ? '#ef4444' : 'var(--color-border)'}`,
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div
      className={`${playfair.variable} ${dmSans.variable} min-h-screen flex flex-col`}
      style={{ backgroundColor: 'var(--color-bg)', fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)' }}
    >
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-sm w-full">
          {/* Wordmark */}
          <div className="text-center mb-10">
            <span
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-primary)' }}
            >
              Heidi
            </span>
          </div>

          {submitted ? (
            <div className="text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto"
                style={{ backgroundColor: 'var(--color-success)', opacity: 0.15 }}
              />
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-6 mx-auto -mt-20"
                style={{ backgroundColor: '#d1fae5' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <h1
                className="text-2xl font-bold mb-3"
                style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
              >
                Check your inbox.
              </h1>
              <p className="text-base" style={{ color: 'var(--color-text-muted)' }}>
                We&rsquo;ve sent a reset link to{' '}
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{email}</span>.
              </p>
              <Link
                href="/login"
                className="inline-block mt-8 text-sm"
                style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1
                className="text-2xl font-bold mb-3 text-center"
                style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
              >
                Reset your password
              </h1>
              <p
                className="text-sm mb-8 text-center"
                style={{ color: 'var(--color-text-muted)' }}
              >
                Enter your email and we&rsquo;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    style={fieldStyle}
                    placeholder="you@example.com"
                  />
                  {error && (
                    <p className="text-sm mt-1.5" style={{ color: '#ef4444' }}>{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-4 rounded-xl text-base font-semibold transition-opacity"
                  style={{
                    backgroundColor: 'var(--color-primary)',
                    color: '#FBF7F2',
                    cursor: loading || !email ? 'not-allowed' : 'pointer',
                    opacity: loading || !email ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
                <Link
                  href="/login"
                  style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Not therapy. Not dating. Not sexual services.
        </p>
      </footer>
    </div>
  )
}
