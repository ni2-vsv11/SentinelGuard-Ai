'use client'

import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, Globe2, Mail, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react'

import { BrandLogo } from '@/components/brand-logo'
import { API_BASE_URL, getAuthHeader } from '@/lib/auth'

type AnalyzeApiResponse = Record<string, unknown>

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
    result.probability,
    result.score,
    result.risk_score,
    result.phishing_probability,
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

export function DetectionForm({ embedded = false }: DetectionFormProps) {
  const [emailText, setEmailText] = useState('')
  const [urlText, setUrlText] = useState('')
  const [result, setResult] = useState<AnalyzeApiResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

  const isSuspicious = useMemo(() => {
    if (typeof probability === 'number') {
      return probability >= 50
    }

    if (riskText) {
      const normalized = riskText.toLowerCase()
      return normalized.includes('suspicious') || normalized.includes('phish') || normalized.includes('malicious')
    }

    return false
  }, [probability, riskText])

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

  const VerdictIcon = verdictTone.icon
  const inputSummary =
    emailText.trim() && urlText.trim()
      ? 'Email and URL'
      : emailText.trim()
        ? 'Email only'
        : 'URL only'

  const handleAnalyze = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setErrorMessage(null)
    setResult(null)

    if (!emailText.trim() && !urlText.trim()) {
      setErrorMessage('Please provide either email text or a URL to analyze.')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
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
      const authHeaders = getAuthHeader()

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

      window.dispatchEvent(new CustomEvent('scanCompleted', { detail: responseData }))
    } catch (error) {
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
    : 'max-w-4xl mx-auto px-6 py-16'

  return (
    <section id="detection" className={containerClassName}>
      {!embedded ? (
        <div className="mb-12 text-center">
          <div className="mb-4 flex justify-center">
            <BrandLogo className="h-12 w-12 text-primary" />
          </div>
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
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {result && (
          <div className={`w-full max-w-full overflow-hidden rounded-2xl border ${verdictTone.card} ${verdictTone.shadow}`}>
            <div className={`h-1 w-full ${verdictTone.bar}`} />
            <div className="min-w-0 p-6 md:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${verdictTone.accent}`}>
                      <VerdictIcon size={16} />
                      {verdictLabel}
                    </span>
                    {typeof probability === 'number' ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3 py-1 text-sm font-semibold text-foreground shadow-sm">
                        <Sparkles size={14} className="text-primary" />
                        {Math.round(probability)}% confidence
                      </span>
                    ) : null}
                    {typeof confidentiality === 'number' ? (
                      <span className="rounded-full border border-black/5 bg-white px-3 py-1 text-sm font-medium text-foreground/75 shadow-sm">
                        Confidentiality {Math.round(confidentiality)}%
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
                    <div className="grid min-w-[720px] grid-cols-3 divide-x divide-black/5">
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
                        <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-foreground md:text-base">
                          {recommendationText || 'Review carefully before interacting.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-sm shrink-0 rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm lg:max-w-xs">
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
      </form>
    </section>
  )
}
