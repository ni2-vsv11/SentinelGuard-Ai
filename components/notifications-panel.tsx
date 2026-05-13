'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Bell, BellRing, CheckCircle2, ExternalLink, ShieldAlert, X } from 'lucide-react'
import { getAuthHeader } from '@/lib/auth'

const NOTIFICATIONS_API_BASE = '/api/notifications'

type Notification = {
  _id: string
  title: string
  message: string
  severity: 'low' | 'medium' | 'high'
  is_read: boolean
  timestamp: string
  notification_type: string
  detection_details?: Record<string, unknown>
}

type NotificationsPanelProps = {
  isOpen?: boolean
  onClose?: () => void
}

export function NotificationsPanel({ isOpen = true, onClose }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const authHeaders = getAuthHeader()
      if (Object.keys(authHeaders).length === 0) return

      const response = await fetch(`${NOTIFICATIONS_API_BASE}?limit=3&unread_only=true`, {
        headers: authHeaders,
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }

      const countResponse = await fetch(`${NOTIFICATIONS_API_BASE}/unread-count`, {
        headers: authHeaders,
      })

      if (countResponse.ok) {
        const countData = await countResponse.json()
        setUnreadCount(countData.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onScanCompleted = () => {
      fetchNotifications()
    }

    window.addEventListener('scanCompleted', onScanCompleted)
    fetchNotifications()

    return () => window.removeEventListener('scanCompleted', onScanCompleted)
  }, [isOpen])

  const markAsRead = async (notificationId: string) => {
    try {
      const authHeaders = getAuthHeader()
      const response = await fetch(`${NOTIFICATIONS_API_BASE}/${notificationId}/mark-read`, {
        method: 'POST',
        headers: authHeaders,
      })

      if (response.ok) {
        setNotifications(
          notifications.map((notif) =>
            notif._id === notificationId ? { ...notif, is_read: true } : notif
          )
        )
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const authHeaders = getAuthHeader()
      const response = await fetch(`${NOTIFICATIONS_API_BASE}/mark-all-read`, {
        method: 'POST',
        headers: authHeaders,
      })

      if (response.ok) {
        setNotifications(notifications.map((notif) => ({ ...notif, is_read: true })))
        setUnreadCount(0)
        setNotifications([])
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200/80 bg-gradient-to-br from-red-50/90 via-white/80 to-rose-50/80'
      case 'medium':
        return 'border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-white/80 to-orange-50/80'
      default:
        return 'border-sky-200/80 bg-gradient-to-br from-sky-50/90 via-white/80 to-cyan-50/80'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-amber-600'
      default:
        return 'text-sky-600'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'High alert'
      case 'medium':
        return 'Review'
      default:
        return 'Info'
    }
  }

  if (!isOpen) {
    return null
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div
      className="fixed z-50 flex w-[min(92vw,28rem)] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white/60 shadow-[0_30px_80px_-24px_rgba(15,23,42,0.38)] backdrop-blur-2xl transition-transform duration-300"
      style={{
        right: '1rem',
        top: 'max(1rem, env(safe-area-inset-top))',
        height: 'calc(100dvh - max(1rem, env(safe-area-inset-top)) - 1rem)',
      }}
    >
      <div className="border-b border-white/55 bg-gradient-to-r from-white/75 via-white/55 to-cyan-50/55 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-sm backdrop-blur-xl">
              <BellRing size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-foreground">Alerts</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground/55">Recent phishing scan notifications</p>
            </div>
          </div>

          <button
            onClick={() => onClose?.()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/70 bg-white/75 shadow-sm transition hover:bg-white"
            aria-label="Close notifications"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="border-b border-white/45 px-4 py-3">
        <button
          onClick={markAllAsRead}
          className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-semibold text-primary shadow-sm backdrop-blur-xl transition hover:bg-white"
        >
          <CheckCircle2 size={16} />
          Clear alerts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {notifications.length === 0 ? (
          <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-3 rounded-[1.75rem] border border-white/60 bg-white/65 p-8 text-center text-foreground/55 shadow-sm backdrop-blur-xl">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm">
              <ShieldAlert size={24} className="text-primary" />
            </div>
            <p className="text-base font-semibold text-foreground">No alerts yet</p>
            <p className="max-w-xs text-sm leading-6 text-foreground/55">When a scan returns suspicious or harmful results, the notification will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const details = notification.detection_details as Record<string, unknown> | undefined

              return (
              <div
                key={notification._id}
                className={`cursor-pointer overflow-hidden rounded-[1.5rem] border p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-24px_rgba(15,23,42,0.28)] ${getSeverityColor(notification.severity)} ${notification.is_read ? 'opacity-65' : 'opacity-100'}`}
                onClick={() => !notification.is_read && markAsRead(notification._id)}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    size={18}
                    className={`mt-0.5 shrink-0 ${getSeverityIcon(notification.severity)}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{notification.title}</h3>
                      <span className="inline-flex items-center rounded-full border border-white/70 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground/55 backdrop-blur-xl">
                        {getSeverityLabel(notification.severity)}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-sm leading-6 text-foreground/75">
                      {notification.message}
                    </p>
                    {details && (
                      <div className="mt-3 space-y-2 rounded-2xl border border-white/65 bg-white/70 p-3 text-xs text-foreground/65 shadow-sm backdrop-blur-xl">
                        {typeof details.url === 'string' && details.url && (
                          <p className="flex items-center gap-2 truncate">
                            <ExternalLink size={12} className="shrink-0" />
                            <span className="font-semibold text-foreground/75">URL:</span>
                            {details.url}
                          </p>
                        )}
                        {typeof details.email_preview === 'string' && details.email_preview && (
                          <p className="truncate">
                            <span className="font-semibold text-foreground/75">Email:</span>{' '}
                            {details.email_preview}
                          </p>
                        )}
                        {typeof details.risk_score === 'number' && (
                          <p className="flex items-center gap-2">
                            <span className="font-semibold text-foreground/75">Risk score:</span>{' '}
                            {Math.round(details.risk_score)}%
                          </p>
                        )}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-foreground/50">
                      {formatTime(notification.timestamp)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export function NotificationsBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)

    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    const handleScanCompleted = () => {
      fetchUnreadCount()
    }

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 10000) // Poll every 10 seconds

    fetchUnreadCount()
    window.addEventListener('scanCompleted', handleScanCompleted)

    return () => {
      clearInterval(interval)
      window.removeEventListener('scanCompleted', handleScanCompleted)
    }
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const authHeaders = getAuthHeader()
      if (Object.keys(authHeaders).length === 0) return

      const response = await fetch(`${NOTIFICATIONS_API_BASE}/unread-count`, {
        headers: authHeaders,
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unread_count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className="relative rounded-2xl border border-white/70 bg-white/70 p-2.5 shadow-sm backdrop-blur-xl transition hover:bg-white"
        title="Notifications"
      >
        <Bell size={20} className="text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isMounted &&
        isPanelOpen &&
        createPortal(
          <NotificationsPanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} />,
          document.body
        )}
    </>
  )
}
