'use client'

import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'

import { BrandLogo } from '@/components/brand-logo'
import { getStoredUser, syncAuthSessionFromStorage } from '@/lib/auth'

type ProtectedRouteProps = {
  children: ReactNode
  requireRole?: 'admin' | 'user'
  fallbackPath?: string
}

export function ProtectedRoute({
  children,
  requireRole,
  fallbackPath = '/login',
}: ProtectedRouteProps) {
  const router = useRouter()
  const [isReady, setIsReady] = useState(false)

  const authSnapshot = useMemo(() => {
    const hasValidSession = syncAuthSessionFromStorage()
    const user = getStoredUser()
    return { hasValidSession, user }
  }, [])

  useEffect(() => {
    if (!authSnapshot.hasValidSession) {
      router.replace(fallbackPath)
      return
    }

    if (requireRole && authSnapshot.user?.role !== requireRole) {
      router.replace('/dashboard')
      return
    }

    setIsReady(true)
  }, [authSnapshot.hasValidSession, authSnapshot.user?.role, fallbackPath, requireRole, router])

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo className="h-14 w-14 text-primary" />
          <p className="text-sm font-semibold text-primary">SentinelGuard AI</p>
          <p className="text-sm text-foreground/70">Authorizing access...</p>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
