'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

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
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="text-xl font-bold text-foreground">
          SentinelGuard AI
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
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-foreground hover:text-primary transition hidden sm:block"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary transition hover:bg-muted"
              >
                Logout
              </button>
              {user.role !== 'admin' ? (
                <Link
                  href="/login?admin=true"
                  className="text-sm font-medium text-foreground/70 hover:text-primary transition hidden sm:block border-l border-black/10 pl-4"
                >
                  Admin Login
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-foreground hover:text-primary transition hidden sm:block">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#39ff14] hover:text-[#04130a] active:bg-[#39ff14] active:text-[#04130a]"
              >
                Get Started
              </Link>
              <Link
                href="/login?admin=true"
                className="text-sm font-medium text-foreground/70 hover:text-primary transition hidden sm:block border-l border-black/10 pl-4"
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
