import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Heidi - Emotional Support & Companionship',
  description: 'Safe, nonsexual emotional support and practical companionship for womxn and the LGBTQIA community',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
