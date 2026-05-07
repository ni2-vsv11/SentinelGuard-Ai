'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { ProtectedRoute } from '@/components/protected-route'

export default function AdminDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard')
  }, [router])

  return (
    <ProtectedRoute requireRole="admin">
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-3xl rounded-xl border border-muted bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-primary">Admin Route Moved</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Use the Main Dashboard</h1>
          <p className="mt-3 text-sm text-foreground/70">
            Admin features are now available directly in the main dashboard.
          </p>
        </div>
      </main>
    </ProtectedRoute>
  )
}
