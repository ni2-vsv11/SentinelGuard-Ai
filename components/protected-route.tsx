'use client'

import { useRouter } from 'next/navigation'
import { ReactNode, useEffect, useMemo, useState } from 'react'

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
    return <main className="min-h-screen bg-background px-6 py-12">Authorizing access...</main>
  }

  return <>{children}</>
}
