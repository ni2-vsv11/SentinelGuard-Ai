'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import { API_BASE_URL, clearAuthStorage, storeAuthSession } from '@/lib/auth'

type AuthMode = 'login' | 'signup'

type AuthFormProps = {
  mode: AuthMode
}

type FormErrors = {
  email?: string
  password?: string
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isLogin = mode === 'login'

  const authenticate = async (endpoint: '/auth/login' | '/auth/signup') => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
      }),
    })

    const payload = (await response.json()) as {
      token?: string
      message?: string
      user?: { email?: string; role?: string }
    }

    if (!response.ok) {
      throw new Error(payload.message || 'Authentication request failed.')
    }

    return payload
  }

  const validateForm = () => {
    const nextErrors: FormErrors = {}

    if (!email.trim()) {
      nextErrors.email = 'Email is required.'
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextErrors.password = 'Password is required.'
    } else if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!validateForm()) {
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const loginPayload = isLogin
        ? await authenticate('/auth/login')
        : (() => {
            return authenticate('/auth/signup').then(() => authenticate('/auth/login'))
          })()

      if (!loginPayload.token) {
        throw new Error('Login succeeded but token was not returned.')
      }

      clearAuthStorage()
      storeAuthSession(loginPayload.token, loginPayload.user?.email || normalizedEmail)
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to authenticate at this time.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="glass-panel w-full max-w-md rounded-xl p-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-semibold text-primary">SentinelGuard AI</p>
        <h1 className="text-3xl font-bold text-foreground">
          {isLogin ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="text-sm leading-relaxed text-foreground/60">
          {isLogin
            ? 'Log in to continue monitoring phishing threats.'
            : 'Sign up to start using AI-powered phishing detection.'}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/35"
          />
          {errors.email ? <p className="text-sm text-red-600">{errors.email}</p> : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-semibold text-foreground">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="w-full rounded-lg border border-black/10 bg-white/80 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/35"
          />
          {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : null}
        </div>

        {submitError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Please wait...' : isLogin ? 'Login' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-foreground/60">
        {isLogin ? 'New to SentinelGuard AI?' : 'Already have an account?'}{' '}
        <Link
          href={isLogin ? '/signup' : '/login'}
          className="font-semibold text-primary transition hover:text-secondary"
        >
          {isLogin ? 'Create an account' : 'Login'}
        </Link>
      </p>
    </div>
  )
}
