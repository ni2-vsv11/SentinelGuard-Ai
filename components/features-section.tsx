'use client'

import {
  Mail,
  Globe,
  Bell,
  Zap,
  Clock,
} from 'lucide-react'

export function FeaturesSection() {
  const features = [
    {
      icon: Mail,
      title: 'Email Analysis',
      description: 'Deep-scan SMTP headers, content, and attachments for hidden deceptive patterns',
    },
    {
      icon: Globe,
      title: 'URL Verification',
      description: 'Real-time domain reputation check and structural analysis of complex URLs',
    },
    {
      icon: Bell,
      title: 'Real-time Alerts',
      description: 'Instant notifications on dashboard, email, or API for every detection event',
    },
    {
      icon: Zap,
      title: 'Confidence Scoring',
      description: 'Numerical security metrics that go beyond simple "safe" or "unsafe" classification',
    },
    {
      icon: Clock,
      title: 'Fast Detection',
      description: 'Proprietary algorithm delivers results in milliseconds, ensuring fast reaction',
    },
  ]

  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
      <div className="mb-10 flex flex-col items-start justify-between gap-4 md:mb-12 md:flex-row md:items-center">
        <div className="max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Unmatched Protection Features</h2>
          <p className="text-foreground/60">
            Built for the modern enterprise, designed for human simplicity
          </p>
        </div>
        <div className="inline-block rounded-full border border-black/10 bg-white/68 px-4 py-2 backdrop-blur-sm backdrop-saturate-150 md:mt-0">
          <span className="text-sm font-semibold text-primary">5 Active Security Modules</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <div
              key={index}
              className="glass-panel group rounded-xl p-6 transition hover:border-primary/45"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary transition group-hover:bg-primary/30">
                <Icon size={24} />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-foreground/60">{feature.description}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
