'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { BrandLogo } from '@/components/brand-logo'
import { clearAuthStorage, getStoredUser, syncAuthSessionFromStorage, type AuthUser } from '@/lib/auth'

export function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)

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
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/68 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 text-lg font-bold text-foreground sm:text-xl">
          <BrandLogo className="h-9 w-9 text-primary" />
          <span>SentinelGuard AI</span>
        </div>

        {/* Center Menu */}
        <div className="hidden md:flex gap-8">
          <a href="#home" className="text-sm font-medium text-primary hover:text-secondary transition">
            Home
          </a>
          <a href="#detection" className="text-sm font-medium text-foreground hover:text-primary transition">
            Detection
          </a>
          <a href="#process" className="text-sm font-medium text-foreground hover:text-primary transition">
            Process
          </a>
          <a href="#features" className="text-sm font-medium text-foreground hover:text-primary transition">
            Features
          </a>
          <a href="#team" className="text-sm font-medium text-foreground hover:text-primary transition">
            Team
          </a>
        </div>

        {/* Right Section */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 md:justify-end">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hidden text-sm font-medium text-foreground transition hover:text-primary sm:block"
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
              {user.role !== 'admin' ? (
                <Link
                  href="/login?admin=true"
                  className="hidden border-l border-black/10 pl-4 text-sm font-medium text-foreground/70 transition hover:text-primary sm:block"
                >
                  Admin Login
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-foreground transition hover:text-primary sm:block">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary sm:px-6"
              >
                Get Started
              </Link>
              <Link
                href="/login?admin=true"
                className="hidden border-l border-black/10 pl-4 text-sm font-medium text-foreground/70 transition hover:text-primary sm:block"
              >
                Admin Login
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
