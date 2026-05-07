'use client'

import { BrandLogo } from '@/components/brand-logo'

export function MonitoringDashboard() {
  const threats = [
    {
      source: 'paypal-secure-auth.net',
      timestamp: '15 mins ago',
      type: 'Phishing',
      status: 'phishing',
      score: '98%',
    },
    {
      source: 'support@xyz.com',
      timestamp: '1 hour ago',
      type: 'Email Header',
      status: 'safe',
      score: '0.2%',
    },
    {
      source: 'verify-bank-details.exe',
      timestamp: '3 hours ago',
      type: 'Credential Harvest',
      status: 'phishing',
      score: '94%',
    },
    {
      source: 'newsletter@company.net',
      timestamp: '5 hours ago',
      type: 'Safe Content',
      status: 'safe',
      score: '0.1%',
    },
    {
      source: 'admin-portal-confirm.io',
      timestamp: '8 hours ago',
      type: 'URL Malicious',
      status: 'phishing',
      score: '87%',
    },
  ]

  const getStatusBadge = (status: string) => {
    if (status === 'phishing') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          Phishing
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        Safe
      </span>
    )
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
      <div className="mb-10 flex items-center gap-3 sm:mb-12">
        <BrandLogo className="h-10 w-10 text-primary" />
        <h2 className="text-3xl font-bold sm:text-4xl">Threat Monitoring Dashboard</h2>
      </div>

      <div className="glass-panel overflow-x-auto rounded-xl">
        <table className="min-w-[760px] w-full">
          <thead>
            <tr className="border-b border-black/10 bg-white/76">
              <th className="px-4 py-4 text-left font-semibold text-foreground sm:px-6">ENTITY SOURCE</th>
              <th className="px-4 py-4 text-left font-semibold text-foreground sm:px-6">TIMESTAMP</th>
              <th className="px-4 py-4 text-left font-semibold text-foreground sm:px-6">THREAT TYPE</th>
              <th className="px-4 py-4 text-left font-semibold text-foreground sm:px-6">STATUS</th>
              <th className="px-4 py-4 text-left font-semibold text-foreground sm:px-6">SCORE</th>
            </tr>
          </thead>
          <tbody>
            {threats.map((threat, index) => (
              <tr
                key={index}
                className="border-b border-black/10 transition hover:bg-white/70"
              >
                <td className="px-4 py-4 text-sm font-mono text-foreground/70 sm:px-6">
                  {threat.source}
                </td>
                <td className="px-4 py-4 text-sm text-foreground/60 sm:px-6">{threat.timestamp}</td>
                <td className="px-4 py-4 text-sm text-foreground sm:px-6">{threat.type}</td>
                <td className="px-4 py-4 sm:px-6">{getStatusBadge(threat.status)}</td>
                <td className="px-4 py-4 text-sm font-semibold sm:px-6">{threat.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
