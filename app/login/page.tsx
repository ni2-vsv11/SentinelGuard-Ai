'use client'

import { AuthForm } from '@/components/auth-form'

export default function LoginPage() {
  return (
    <main className="glass-main min-h-screen bg-transparent px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl items-center justify-center">
        <AuthForm mode="login" />
      </div>
    </main>
  )
}
