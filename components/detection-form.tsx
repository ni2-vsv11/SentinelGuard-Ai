'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BellRing, Globe2, Mail, ShieldAlert, ShieldCheck, Sparkles, X } from 'lucide-react'

import { API_BASE_URL, getAuthHeader } from '@/lib/auth'

type AnalysisSection = {
  status: string
  confidence: number
  risk_score: number
  prediction?: string
  email_risk?: number
  url_risk?: number
  email_summary?: string
  site_summary?: string
  site_domain?: string
}

type SeparateAnalysis = {
  email: AnalysisSection
  url: AnalysisSection
}

type ResultNotificationTone = 'safe' | 'warning' | 'danger'

type ResultNotification = {
  title: string
  message: string
  scope: string
  tone: ResultNotificationTone
  score: number
  domain?: string
}

type AnalyzeApiResponse = Record<string, unknown> & {
  status?: string
  confidence?: number
  risk_score?: number
  confidentiality_score?: number
  probability?: number
  score?: number
  phishing_probability?: number
  ml_probability?: number
  heuristic_risk?: number
  trusted_domain?: boolean
  url_risk?: number
  email_risk?: number
  message?: string
  ai_explanation?: string
  site_summary?: string
  email_summary?: string
  recommendation?: string
  identified_sender?: string
  site_domain?: string
  separate_analysis?: SeparateAnalysis
}

type DetectionFormProps = {
  embedded?: boolean
}

const API_ENDPOINT = '/api/analyze'
const SAVE_SCAN_ENDPOINT = `${API_BASE_URL}/scan-results`

function getProbability(result: AnalyzeApiResponse | null): number | null {
  if (!result) {
    return null
  }

  const candidates = [
    result.risk_score,
    result.probability,
    result.score,
    result.risk_score,
    result.phishing_probability,
    result.confidence,
    result.confidentiality_score,
  ]

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
  }

  return null
}

function getTextValue(result: AnalyzeApiResponse | null, keys: string[]): string | null {
  if (!result) {
    return null
  }

  for (const key of keys) {
    const value = result[key]
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

function getResultNotificationTone(status: string): ResultNotificationTone {
  const normalized = status.toLowerCase().trim()

  if (normalized === 'safe') {
    return 'safe'
  }

  if (normalized === 'harmful') {
    return 'danger'
  }

  return 'warning'
}

function getNotificationStyles(tone: ResultNotificationTone) {
  switch (tone) {
    case 'safe':
      return {
        card: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50/90 via-white/85 to-cyan-50/80',
        accent: 'text-emerald-700 bg-emerald-100/90 ring-emerald-200/80',
        icon: 'text-emerald-600',
        bar: 'bg-emerald-500',
      }
    case 'danger':
      return {
        card: 'border-red-200/70 bg-gradient-to-br from-red-50/90 via-white/85 to-rose-50/80',
        accent: 'text-red-700 bg-red-100/90 ring-red-200/80',
        icon: 'text-red-600',
        bar: 'bg-red-500',
      }
    default:
      return {
        card: 'border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white/85 to-orange-50/80',
        accent: 'text-amber-700 bg-amber-100/90 ring-amber-200/80',
        icon: 'text-amber-600',
        bar: 'bg-amber-500',
      }
  }
}

function getResultNotificationKey(notification: ResultNotification) {
  return `${notification.scope}-${notification.title}-${notification.domain ?? 'general'}`
}

export function DetectionForm({ embedded = false }: DetectionFormProps) {
  const [emailText, setEmailText] = useState('')
  const [urlText, setUrlText] = useState('')
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requiresLogin, setRequiresLogin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [visibleToasts, setVisibleToasts] = useState<ResultNotification[]>([])

  const probability = useMemo(() => getProbability(result), [result])

  const riskText = useMemo(() => {
    return getTextValue(result, ['label', 'risk', 'status'])
  }, [result])

  const explanationText = useMemo(() => {
    return getTextValue(result, ['ai_explanation', 'message', 'details', 'explanation'])
  }, [result])

  const confidentiality = useMemo(() => {
    if (!result) return null
    const candidates = [result.confidentiality_score, result.confidentialityScore, result.confidence]
    for (const v of candidates) {
      if (typeof v === 'number' && Number.isFinite(v)) return v
    }
    return null
  }, [result])

  const siteSummaryText = useMemo(() => {
    return getTextValue(result, ['site_summary', 'site', 'site_context'])
  }, [result])

  const emailSummaryText = useMemo(() => {
    return getTextValue(result, ['email_summary', 'email_risk', 'email_context'])
  }, [result])

  const recommendationText = useMemo(() => {
    return getTextValue(result, ['recommendation', 'action', 'next_step'])
  }, [result])

  const senderText = useMemo(() => {
    return getTextValue(result, ['identified_sender', 'sender'])
  }, [result])

  const inputSummary =
    emailText.trim() && urlText.trim()
      ? 'Email and URL'
      : emailText.trim()
        ? 'Email only'
        : 'URL only'

  const separateAnalysis = result?.separate_analysis

  const isSuspicious = useMemo(() => {
    // First check the explicit status/risk text from backend (most reliable)
    if (riskText) {
      const normalized = riskText.toLowerCase().trim()
      
      // Explicitly check for Safe status first
      if (normalized === 'safe') {
        return false
      }
      
      // Check for suspicious/threat/harmful indicators
      if (normalized === 'suspicious' || normalized === 'harmful' || normalized.includes('phishing') || normalized.includes('phish') || normalized.includes('malicious') || normalized.includes('threat')) {
        return true
      }
    }

    // If no explicit status, fall back to probability score
    if (typeof probability === 'number') {
      // Normalize confidence to 0-100 range if needed
      const normalizedProb = probability > 1 ? probability : probability * 100
      // Risk score thresholds match backend classification: 35+ is suspicious, 70+ is harmful
      return normalizedProb >= 35
    }

    // Default to safe if no data available
    return false
  }, [riskText, probability])

  const verdictLabel = riskText || (isSuspicious ? 'Suspicious' : 'Safe')
  const verdictTone = isSuspicious
    ? {
        card: 'border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50/80',
        accent: 'bg-red-100 text-red-700 ring-red-200',
        icon: ShieldAlert,
        bar: 'bg-red-500',
        shadow: 'shadow-[0_18px_50px_-24px_rgba(239,68,68,0.45)]',
      }
    : {
        card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-cyan-50/70',
        accent: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
        icon: ShieldCheck,
        bar: 'bg-emerald-500',
        shadow: 'shadow-[0_18px_50px_-24px_rgba(16,185,129,0.45)]',
      }

  const resultNotifications = useMemo<ResultNotification[]>(() => {
    if (!result) {
      return []
    }

    const notifications: ResultNotification[] = []

    const addNotification = (
      scope: string,
      section: Pick<AnalysisSection, 'status' | 'risk_score' | 'site_domain'>
    ) => {
      const tone = getResultNotificationTone(section.status)
      const score = Math.round(Number(section.risk_score ?? probability ?? 0))
      const title = tone === 'safe' ? 'Safe scan' : tone === 'danger' ? 'High-risk alert' : 'Suspicious alert'
      const message =
        tone === 'safe'
          ? `${scope} looks safe. No phishing indicators were found.`
          : `${scope} flagged as ${section.status.toLowerCase()} with a ${score}% risk score.`

      notifications.push({
        title,
        message,
        scope,
        tone,
        score,
        domain: section.site_domain,
      })
    }

    if (separateAnalysis) {
      addNotification('Email analysis', separateAnalysis.email)
      addNotification('URL analysis', separateAnalysis.url)
    } else {
      addNotification(inputSummary, {
        status: verdictLabel,
        risk_score: probability ?? 0,
        site_domain: result.site_domain,
      })
    }

    return notifications
  }, [inputSummary, probability, result, separateAnalysis, verdictLabel])

  useEffect(() => {
    if (resultNotifications.length === 0) {
      setVisibleToasts([])
      return
    }

    setVisibleToasts(resultNotifications)
    const timer = window.setTimeout(() => {
      setVisibleToasts([])
    }, 7000)

    return () => window.clearTimeout(timer)
  }, [resultNotifications])

  const VerdictIcon = verdictTone.icon

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage(null)
    setRequiresLogin(false)
    setResult(null)

    if (!emailText.trim() && !urlText.trim()) {
      setErrorMessage('Please provide either email text or a URL to analyze.')
      return
    }

    const authHeaders = getAuthHeader()
    if (Object.keys(authHeaders).length === 0) {
      setRequiresLogin(true)
      setErrorMessage('Please log in to check an email or URL.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          email: emailText,
          url: urlText,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      let responseData: AnalyzeApiResponse = {}

      if (contentType.includes('application/json')) {
        responseData = (await response.json()) as AnalyzeApiResponse
      } else {
        const text = await response.text()
        responseData = { message: text }
      }

      if (!response.ok) {
        const message =
          response.status === 401
            ? 'Session expired. Please log in again.'
            : (typeof responseData.message === 'string' && responseData.message) ||
              `Request failed with status ${response.status}.`
        throw new Error(message)
      }

      setResult(responseData)
      window.dispatchEvent(new CustomEvent('scanCompleted', { detail: responseData }))

      // Persist successful scan so dashboard history can show recent entries.
      if (Object.keys(authHeaders).length > 0) {
        await fetch(SAVE_SCAN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            email: emailText,
            url: urlText,
            result: responseData,
          }),
        })
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'Session expired. Please log in again.') {
        setRequiresLogin(true)
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to analyze this input right now. Please try again.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const containerClassName = embedded
    ? 'space-y-6 rounded-2xl'
    : 'mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:max-w-7xl'

  return (
    <section id="detection" className={containerClassName}>
      {!embedded ? (
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold">Check Email and URL</h2>
          <p className="text-lg text-foreground/60">
            Paste the message you want reviewed and add the link you want to verify.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleAnalyze} className={embedded ? 'space-y-5' : 'glass-panel space-y-6 rounded-2xl p-8'} noValidate>
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Email content to check</label>
          <p className="text-xs text-foreground/55">Paste the email body, headers, or suspicious message text.</p>
          <textarea
            autoFocus
            value={emailText}
            onChange={(event) => setEmailText(event.target.value)}
            placeholder="Paste your email content here..."
            className="w-full resize-none rounded-lg border border-black/10 bg-white/78 p-4 text-foreground placeholder:text-foreground/45 focus:outline-none focus:ring-2 focus:ring-primary/35"
            rows={embedded ? 3 : 4}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">URL to check</label>
          <p className="text-xs text-foreground/55">Add the link to inspect before clicking or sharing it.</p>
          <input
            type="url"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder="https://example-secure-login.com"
            className="w-full rounded-lg border border-black/10 bg-white/78 p-4 text-foreground placeholder:text-foreground/45 focus:outline-none focus:ring-2 focus:ring-primary/35"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-secondary"
        >
          {isLoading ? 'Checking...' : 'Check now'}
        </button>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 sm:px-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="font-medium leading-6">{errorMessage}</p>
                {requiresLogin ? (
                  <p className="text-xs leading-5 text-red-700/80">
                    Log in on a mobile or desktop browser to analyze email content and URLs.
                  </p>
                ) : null}
              </div>
              {requiresLogin ? (
                <Link
                  href="/login"
                  className="inline-flex w-full justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary sm:w-auto"
                >
                  Log in
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {result && (
          <div className={`w-full max-w-full overflow-hidden rounded-2xl border ${verdictTone.card} ${verdictTone.shadow}`}>
            <div className={`h-1 w-full ${verdictTone.bar}`} />
            <div className="min-w-0 p-6 md:p-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-[1.65] space-y-4 xl:pr-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${verdictTone.accent}`}>
                      <VerdictIcon size={16} />
                      {verdictLabel}
                    </span>
                    {typeof probability === 'number' ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 text-sm font-semibold text-foreground shadow-sm">
                        <Sparkles size={14} className="text-primary" />
                        Risk score {Math.round(probability)}%
                      </span>
                    ) : null}
                    {typeof confidentiality === 'number' ? (
                      <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-sm font-medium text-foreground/75 shadow-sm">
                        Safety score {Math.round(confidentiality)}%
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-foreground md:text-2xl">
                      {isSuspicious ? 'Potential phishing indicators were found.' : 'The submitted content looks low risk.'}
                    </h3>
                    <p className="mt-2 max-w-3xl break-words text-sm leading-6 text-foreground/70 md:text-base">
                      {explanationText || (isSuspicious ? 'Potential phishing attempt detected based on backend analysis.' : 'This content appears legitimate according to backend analysis.')}
                    </p>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    <div className="rounded-2xl border border-black/5 bg-white/95 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                        <Mail size={14} />
                        Sender
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold leading-6 text-foreground">
                        {senderText || 'Not identified'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white/95 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                        <Globe2 size={14} />
                        Scope
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold leading-6 text-foreground">
                        {inputSummary}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-black/5 bg-white/95 p-4 shadow-sm">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                        <AlertCircle size={14} />
                        Recommendation
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold leading-6 text-foreground">
                        {recommendationText || 'Review carefully before interacting.'}
                      </p>
                    </div>
                  </div>

                  <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white/85 shadow-sm md:block">
                    <div className="grid min-w-[760px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)] divide-x divide-black/5">
                      <div className="bg-white/95 p-4 md:p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                          <Mail size={14} />
                          Sender
                        </div>
                        <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground md:text-base">
                          {senderText || 'Not identified'}
                        </p>
                      </div>

                      <div className="bg-white/95 p-4 md:p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                          <Globe2 size={14} />
                          Scope
                        </div>
                        <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground md:text-base">
                          {inputSummary}
                        </p>
                      </div>

                      <div className="bg-white/95 p-4 md:p-5">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground/45">
                          <AlertCircle size={14} />
                          Recommendation
                        </div>
                        <p className="mt-2 break-words text-sm font-semibold leading-6 text-foreground md:text-base">
                          {recommendationText || 'Review carefully before interacting.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-sm shrink-0 rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm xl:max-w-[220px]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/45">Risk Breakdown</p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground/75">Assessment</span>
                        <span className="font-semibold text-foreground">{verdictLabel}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div className={`h-2 rounded-full ${verdictTone.bar}`} style={{ width: `${Math.min(Math.max(probability ?? (isSuspicious ? 72 : 28), 8), 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground/75">Explanation</span>
                        <span className="font-semibold text-foreground">{isSuspicious ? 'Caution' : 'Clear'}</span>
                      </div>
                      <p className="break-words text-sm leading-6 text-foreground/70">
                        {siteSummaryText || emailSummaryText || 'Detailed reasoning is available in the summary above.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {separateAnalysis && (
          <div className="w-full space-y-5">
            <h3 className="text-lg font-semibold text-foreground">Detailed Analysis - Email & URL Breakdown</h3>
            
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Email Analysis */}
              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/90 shadow-sm">
                <div className={`h-1 w-full ${separateAnalysis.email.status === 'Safe' ? 'bg-emerald-500' : separateAnalysis.email.status === 'Harmful' ? 'bg-red-600' : 'bg-red-500'}`} />
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Mail size={20} className={separateAnalysis.email.status === 'Safe' ? 'text-emerald-600' : 'text-red-600'} />
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">Email Analysis</h4>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {separateAnalysis.email.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-black/2 p-3">
                      <span className="text-sm text-foreground/70">Risk Score</span>
                      <span className="font-semibold text-foreground">{Math.round(separateAnalysis.email.risk_score)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-black/2 p-3">
                      <span className="text-sm text-foreground/70">Safety Score</span>
                      <span className="font-semibold text-foreground">{Math.round(100 - separateAnalysis.email.risk_score)}%</span>
                    </div>
                    {separateAnalysis.email.email_summary && (
                      <div className="rounded-lg bg-black/2 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Summary</p>
                        <p className="mt-2 break-words text-sm leading-5 text-foreground/80">
                          {separateAnalysis.email.email_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* URL Analysis */}
              <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/90 shadow-sm">
                <div className={`h-1 w-full ${separateAnalysis.url.status === 'Safe' ? 'bg-emerald-500' : separateAnalysis.url.status === 'Harmful' ? 'bg-red-600' : 'bg-red-500'}`} />
                <div className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <Globe2 size={20} className={separateAnalysis.url.status === 'Safe' ? 'text-emerald-600' : 'text-red-600'} />
                    <div>
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-foreground/60">URL Analysis</h4>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {separateAnalysis.url.status}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg bg-black/2 p-3">
                      <span className="text-sm text-foreground/70">Risk Score</span>
                      <span className="font-semibold text-foreground">{Math.round(separateAnalysis.url.risk_score)}%</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-black/2 p-3">
                      <span className="text-sm text-foreground/70">Safety Score</span>
                      <span className="font-semibold text-foreground">{Math.round(100 - separateAnalysis.url.risk_score)}%</span>
                    </div>
                    {separateAnalysis.url.site_domain && (
                      <div className="rounded-lg bg-black/2 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Domain</p>
                        <p className="mt-2 break-words text-sm font-mono text-foreground">
                          {separateAnalysis.url.site_domain}
                        </p>
                      </div>
                    )}
                    {separateAnalysis.url.site_summary && (
                      <div className="rounded-lg bg-black/2 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Summary</p>
                        <p className="mt-2 break-words text-sm leading-5 text-foreground/80">
                          {separateAnalysis.url.site_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {visibleToasts.length > 0 && (
        <div className="pointer-events-none fixed right-4 top-4 z-[80] w-[min(92vw,28rem)] space-y-3 sm:right-6 sm:top-6">
          {visibleToasts.map((notification) => {
            const styles = getNotificationStyles(notification.tone)
            const toastKey = getResultNotificationKey(notification)

            return (
              <article
                key={toastKey}
                className={`pointer-events-auto overflow-hidden rounded-[1.8rem] border ${styles.card} shadow-[0_26px_75px_-32px_rgba(15,23,42,0.4)] backdrop-blur-2xl transition-all duration-300`}
              >
                <div className={`h-1.5 w-full ${styles.bar}`} />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm ${styles.icon}`}>
                      <BellRing size={18} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${styles.accent}`}>
                              {notification.title}
                            </span>
                            <span className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-3 py-1 text-xs font-medium text-foreground/65 shadow-sm backdrop-blur-xl">
                              {notification.scope}
                            </span>
                          </div>
                          <p className="mt-2 break-words text-sm leading-6 text-foreground/75">
                            {notification.message}
                          </p>
                        </div>

                        <button
                          type="button"
                          className="pointer-events-auto inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/80 text-foreground/70 shadow-sm transition hover:bg-white hover:text-foreground"
                          onClick={() => setVisibleToasts((current) => current.filter((item) => getResultNotificationKey(item) !== toastKey))}
                          aria-label="Dismiss notification"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/40">Risk score</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{notification.score}%</p>
                        </div>
                        <div className="rounded-2xl border border-white/70 bg-white/70 p-3 shadow-sm backdrop-blur-xl">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground/40">Status</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{notification.tone === 'safe' ? 'Safe' : notification.tone === 'danger' ? 'Harmful' : 'Suspicious'}</p>
                        </div>
                      </div>

                      {notification.domain ? (
                        <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-sm text-foreground/70 shadow-sm backdrop-blur-xl">
                          <span className="font-semibold text-foreground">Domain:</span> {notification.domain}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
