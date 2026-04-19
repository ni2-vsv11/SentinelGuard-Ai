'use client'

import { FormEvent, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

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
          <div className={`rounded-xl border-l-4 p-6 ${isSuspicious ? 'border-red-400 bg-red-500/10' : 'border-emerald-400 bg-emerald-500/10'}`}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {isSuspicious ? (
                  <AlertCircle size={24} className="text-red-500" />
                ) : (
                  <CheckCircle size={24} className="text-green-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-sm font-semibold ${isSuspicious ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                    {riskText || (isSuspicious ? 'Suspicious' : 'Safe')}
                  </span>
                  {typeof probability === 'number' ? (
                    <span className="text-lg font-bold text-foreground">{Math.round(probability)}% Probability</span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/70">
                  {explanationText ||
                    (isSuspicious
                      ? 'Potential phishing attempt detected based on backend analysis.'
                      : 'This content appears legitimate according to backend analysis.')}
                </p>
                <pre className="mt-4 overflow-x-auto rounded-lg border border-black/10 bg-white/78 p-3 text-xs text-foreground/70">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  )
}
