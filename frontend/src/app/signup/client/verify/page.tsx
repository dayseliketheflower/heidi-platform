'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async () => {
    setLoading(true)
    setError('')

    // TODO: Replace mock with Persona SDK when ready
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ verified: true })
      .eq('id', user.id)

    if (updateError) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/signup/client/done')
  }

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
          3 of 4
        </span>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-sm w-full">
          {/* Shield icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-8 mx-auto"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FBF7F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>

          <h1
            className="text-3xl font-bold mb-4 text-center"
            style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
          >
            A quick identity check.
          </h1>
          <p
            className="text-base mb-3 text-center leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            We use Persona to verify your identity. It takes about 2 minutes
            and requires a government-issued ID and a selfie.
          </p>
          <p
            className="text-xs text-center mb-10"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Heidi stores only your verification status, not a copy of your ID.
          </p>

          {error && (
            <p className="text-sm text-center mb-4" style={{ color: '#ef4444' }}>{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="w-full py-4 rounded-xl text-base font-semibold transition-opacity flex items-center justify-center gap-3"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FBF7F2',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.85 : 1,
            }}
          >
            {loading ? (
              <>
                <span
                  className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: '#FBF7F2', borderTopColor: 'transparent' }}
                />
                Verifying…
              </>
            ) : (
              'Verify my identity'
            )}
          </button>
        </div>
      </main>
    </div>
  )
}
