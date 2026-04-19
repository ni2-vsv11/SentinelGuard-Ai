import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:5000'

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function resolveBackendBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (configured) {
    return normalizeBaseUrl(configured)
  }

  const hostHeader = request.headers.get('host') || ''
  const hostname = hostHeader.split(':')[0]
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `${request.nextUrl.protocol}//${hostname}:5000`
  }

  return DEFAULT_BACKEND_BASE_URL
}

export async function POST(request: NextRequest) {
  const backendBaseUrl = resolveBackendBaseUrl(request)
  const targetUrl = `${backendBaseUrl}/analyze`

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid JSON payload.' }, { status: 400 })
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.get('authorization') || '',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const payload = await response.json()
      return NextResponse.json(payload, { status: response.status })
    }

    const text = await response.text()
    return NextResponse.json(
      { message: text || 'Backend returned a non-JSON response.' },
      { status: response.status }
    )
  } catch {
    return NextResponse.json(
      {
        message: `Cannot reach backend at ${backendBaseUrl}. Make sure backend is running on port 5000 and try again.`,
      },
      { status: 502 }
    )
  }
}
