import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_BACKEND_BASE_URL = 'http://127.0.0.1:5000'

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function resolveBackendBaseUrl(request: NextRequest): string {
  const configured =
    process.env.API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim()

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

function buildTargetUrl(request: NextRequest, pathSegments: string[] | undefined): string {
  const backendBaseUrl = resolveBackendBaseUrl(request)
  const cleanedSegments = (pathSegments || []).filter(Boolean)
  const suffix = cleanedSegments.length > 0 ? `/${cleanedSegments.join('/')}` : ''
  const searchParams = request.nextUrl.searchParams.toString()
  const query = searchParams ? `?${searchParams}` : ''
  return `${backendBaseUrl}/notifications${suffix}${query}`
}

async function forwardRequest(request: NextRequest, targetUrl: string, method: string) {
  const headers: Record<string, string> = {}
  const authorization = request.headers.get('authorization')
  if (authorization) {
    headers.Authorization = authorization
  }

  if (method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = request.headers.get('content-type') || 'application/json'
  }

  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  }

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      init.body = JSON.stringify(await request.json())
    } catch {
      init.body = undefined
    }
  }

  const response = await fetch(targetUrl, init)
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
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params
  const targetUrl = buildTargetUrl(request, resolvedParams.path)

  try {
    return await forwardRequest(request, targetUrl, 'GET')
  } catch {
    const backendBaseUrl = resolveBackendBaseUrl(request)
    return NextResponse.json(
      {
        message: `Cannot reach backend at ${backendBaseUrl}. Make sure backend is running on port 5000 and try again.`,
      },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const resolvedParams = await params
  const targetUrl = buildTargetUrl(request, resolvedParams.path)

  try {
    return await forwardRequest(request, targetUrl, 'POST')
  } catch {
    const backendBaseUrl = resolveBackendBaseUrl(request)
    return NextResponse.json(
      {
        message: `Cannot reach backend at ${backendBaseUrl}. Make sure backend is running on port 5000 and try again.`,
      },
      { status: 502 }
    )
  }
}