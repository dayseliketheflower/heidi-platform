'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Singleton client — stable across renders, safe to use in useEffect deps
const supabase = createClient()

export default function DonePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/signup/client/verify')
        return
      }

      const { data } = await supabase
        .from('users')
        .select('verified')
        .eq('id', user.id)
        .single()

      if (!data?.verified) {
        router.replace('/signup/client/verify')
        return
      }

      setReady(true)
    }

    checkAccess()
  }, [router])

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#2A1F2A' }}
      />
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{
        backgroundColor: '#2A1F2A',
        fontFamily: 'var(--font-dm-sans, system-ui, sans-serif)',
      }}
    >
      {/* Checkmark */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-8"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        <svg
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FBF7F2"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1
        className="text-4xl font-bold mb-4"
        style={{
          fontFamily: 'var(--font-playfair, Georgia, serif)',
          color: '#FBF7F2',
        }}
      >
        Welcome to Heidi.
      </h1>
      <p
        className="text-base mb-10 max-w-xs leading-relaxed"
        style={{ color: 'var(--color-text-muted)' }}
      >
        You&rsquo;re verified and ready to find your first provider.
      </p>

      <Link
        href="/search"
        className="inline-block py-4 px-10 rounded-xl text-base font-semibold"
        style={{
          backgroundColor: 'var(--color-primary)',
          color: '#FBF7F2',
        }}
      >
        Find a provider
      </Link>
    </div>
  )
}
