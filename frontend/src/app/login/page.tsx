'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { createClient } from '@/lib/supabase/client'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError("That email or password isn't right. Try again.")
      setLoading(false)
      return
    }

    const next = searchParams.get('next') || '/'
    router.push(next)
    router.refresh()
  }

  const fieldStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1.5px solid var(--color-border)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {error && (
        <p
          className="text-sm text-center py-3 px-4 rounded-lg"
          style={{ backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca' }}
        >
          {error}
        </p>
      )}

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
          onChange={(e) => setEmail(e.target.value)}
          style={fieldStyle}
          placeholder="you@example.com"
        />
      </div>

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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={fieldStyle}
          placeholder="Your password"
        />
      </div>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm"
          style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
        >
          Forgot your password?
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-4 rounded-xl text-base font-semibold transition-opacity"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#FBF7F2',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.8 : 1,
        }}
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

export default function LoginPage() {
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

          <h1
            className="text-2xl font-bold mb-8 text-center"
            style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
          >
            Welcome back.
          </h1>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="text-sm text-center mt-6" style={{ color: 'var(--color-text-muted)' }}>
            Don&rsquo;t have an account?{' '}
            <Link
              href="/signup/client"
              style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
            >
              Get started
            </Link>
          </p>

          <p className="text-xs text-center mt-10" style={{ color: 'var(--color-text-muted)' }}>
            Not therapy. Not dating. Not sexual services.
          </p>
        </div>
      </main>
    </div>
  )
}
