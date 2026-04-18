import Link from 'next/link'

export default function SignupClientWelcome() {
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
          1 of 4
        </span>
      </header>

      {/* Body */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-16">
        <div className="max-w-sm w-full text-center">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-playfair, Georgia, serif)', color: 'var(--color-text)' }}
          >
            Find your person.
          </h1>
          <p
            className="text-base mb-10 leading-relaxed"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Heidi connects you with warm, vetted providers for companionship
            when you need a supportive human presence.
          </p>
          <Link
            href="/signup/client/account"
            className="inline-block w-full py-4 px-6 rounded-xl text-center text-base font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: '#FBF7F2',
            }}
          >
            Get started
          </Link>
          <p
            className="text-xs mt-6"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Not therapy. Not dating. Not sexual services.
          </p>
        </div>
      </main>
    </div>
  )
}
