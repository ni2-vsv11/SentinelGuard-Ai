'use client'

import { AuthForm } from '@/components/auth-form'
import { BrandLogo } from '@/components/brand-logo'

export default function LoginPage() {
  return (
    <main className="glass-main min-h-screen bg-transparent px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 text-primary" />
          <span className="text-lg font-bold text-foreground sm:text-xl">SentinelGuard AI</span>
        </div>
        <AuthForm mode="login" />
      </div>
    </main>
  )
}
