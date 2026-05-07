'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

import { BrandLogo } from '@/components/brand-logo'
import { clearAuthStorage, getStoredUser, syncAuthSessionFromStorage, type AuthUser } from '@/lib/auth'

export function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const syncUser = () => {
      const hasSession = syncAuthSessionFromStorage()
      setUser(hasSession ? getStoredUser() : null)
    }

    syncUser()
    window.addEventListener('storage', syncUser)
    return () => window.removeEventListener('storage', syncUser)
  }, [])

  const handleLogout = () => {
    clearAuthStorage()
    setUser(null)
    setIsMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/68 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
          <BrandLogo className="h-9 w-9 text-primary" />
          <span>SentinelGuard AI</span>
        </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#home" className="text-sm font-medium text-primary transition hover:text-secondary">
            Home
            </a>
            <a href="#detection" className="text-sm font-medium text-foreground transition hover:text-primary">
            Detection
            </a>
            <a href="#process" className="text-sm font-medium text-foreground transition hover:text-primary">
            Process
            </a>
            <a href="#features" className="text-sm font-medium text-foreground transition hover:text-primary">
            Features
            </a>
            <a href="#team" className="text-sm font-medium text-foreground transition hover:text-primary">
            Team
            </a>
          </div>

          <div className="hidden items-center gap-2 sm:flex md:gap-4">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-foreground transition hover:text-primary"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-muted sm:px-6"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-foreground transition hover:text-primary">
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary sm:px-6"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-foreground transition hover:border-primary hover:text-primary sm:hidden"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={`mt-4 space-y-4 rounded-2xl border border-black/10 bg-white/95 p-4 shadow-sm backdrop-blur-md transition-all duration-200 sm:hidden ${
            isMobileMenuOpen ? 'block' : 'hidden'
          }`}
        >
          <div className="grid gap-3 border-b border-black/10 pb-4">
            <a
              href="#home"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
            >
              Home
            </a>
            <a
              href="#detection"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
            >
              Detection
            </a>
            <a
              href="#process"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
            >
              Process
            </a>
            <a
              href="#features"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
            >
              Features
            </a>
            <a
              href="#team"
              onClick={closeMobileMenu}
              className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted hover:text-primary"
            >
              Team
            </a>
          </div>

          <div className="grid gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={closeMobileMenu}
                  className="rounded-xl border border-primary px-4 py-3 text-center text-sm font-semibold text-primary transition hover:bg-muted"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-secondary"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="rounded-xl border border-muted px-4 py-3 text-center text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMobileMenu}
                  className="rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-secondary"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
