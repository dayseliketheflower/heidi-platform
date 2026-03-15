import Link from 'next/link'
import { Heart, Shield, Users, Calendar } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Heart className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">Heidi</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/about" className="text-gray-600 hover:text-gray-900">How It Works</Link>
              <Link href="/safety" className="text-gray-600 hover:text-gray-900">Safety</Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">Log In</Link>
              <Link href="/signup" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-50 to-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Safe, Nonsexual Emotional Support When You Need It
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect with vetted providers for compassionate companionship during medical appointments, 
              difficult moments, or whenever you need a supportive human presence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup" className="btn-primary text-lg">
                Find Support
              </Link>
              <Link href="/become-provider" className="btn-outline text-lg">
                Become a Provider
              </Link>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              <strong>This is not therapy, dating, or sexual services.</strong> 
              Heidi provides peer-style emotional support and practical companionship only.
            </p>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How Heidi Can Help
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Medical Appointments',
                description: 'A trusted companion to support you through dental or medical visits',
                icon: '🏥'
              },
              {
                title: 'Emotional Support',
                description: 'Compassionate presence during grief, anxiety, or challenging moments',
                icon: '💙'
              },
              {
                title: 'Public Companionship',
                description: 'Meet in a safe public space for conversation and connection',
                icon: '☕'
              },
              {
                title: 'Activity Companion',
                description: 'Accompaniment during walks, errands, or events',
                icon: '🚶‍♀️'
              },
            ].map((service, i) => (
              <div key={i} className="card text-center">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety First Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Safety & Trust Are Our Foundation
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Every provider is carefully vetted with background checks and identity verification. 
              All sessions have clear boundaries and consent agreements.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Background Checks',
                description: 'All providers undergo identity verification and criminal background screening',
              },
              {
                title: 'Clear Boundaries',
                description: 'Sessions include consent forms and boundary agreements before every meeting',
              },
              {
                title: 'Reporting Tools',
                description: 'In-app safety reporting and dedicated Trust & Safety team review',
              },
            ].map((feature, i) => (
              <div key={i} className="card">
                <h3 className="text-lg font-semibold mb-2 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            {[
              {
                step: '1',
                title: 'Create Your Profile',
                description: 'Sign up and complete identity verification. Choose a membership plan ($29.99/month).',
              },
              {
                step: '2',
                title: 'Find Your Match',
                description: 'Search vetted providers by location, availability, and type of support you need.',
              },
              {
                step: '3',
                title: 'Book & Connect',
                description: 'Set boundaries, book a session, and receive compassionate support on your terms.',
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            You Don't Have to Face Difficult Moments Alone
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join Heidi to connect with compassionate support when you need it most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="px-8 py-4 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
              Get Started Today
            </Link>
            <Link href="/safety" className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-primary-700 transition-colors">
              Learn About Safety
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="h-6 w-6 text-primary-400" />
                <span className="text-xl font-bold text-white">Heidi</span>
              </div>
              <p className="text-sm">
                Safe, nonsexual emotional support and companionship for womxn and the LGBTQIA community.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/how-it-works">How It Works</Link></li>
                <li><Link href="/safety">Safety & Trust</Link></li>
                <li><Link href="/pricing">Pricing</Link></li>
                <li><Link href="/become-provider">Become a Provider</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/policies/code-of-conduct">Code of Conduct</Link></li>
                <li><Link href="/policies/nonsexual-policy">Nonsexual Policy</Link></li>
                <li><Link href="/policies/privacy">Privacy Policy</Link></li>
                <li><Link href="/policies/terms">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/help">Help Center</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/report">Report a Concern</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
            <p>&copy; 2024 Heidi Platform. All rights reserved.</p>
            <p className="mt-2">
              <strong>Not therapy. Not dating. Not sexual services.</strong> Heidi provides peer-style emotional support only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
