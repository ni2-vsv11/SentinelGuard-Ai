'use client'

import { BrandLogo } from '@/components/brand-logo'

export function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white/62 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 md:py-16">
        <div className="mb-8 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="text-center sm:text-left">
            <div className="mb-4 flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-3">
              <BrandLogo className="h-10 w-10 text-primary" />
              <h3 className="text-lg font-bold text-foreground">SentinelGuard AI</h3>
            </div>
            <p className="mx-auto max-w-xs text-sm leading-6 text-foreground/60 sm:mx-0">
              Advanced AI-powered phishing detection and cybersecurity protection
            </p>
            <div className="mt-5 flex justify-center sm:justify-start">
              <a
                href="https://github.com/ni2-vsv11/SentinelGuard-Ai"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-foreground/60 hover:text-primary transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.38 7.86 10.9.57.1.78-.25.78-.55 0-.27-.01-1.17-.01-2.12-3.2.7-3.88-1.38-3.88-1.38-.52-1.33-1.27-1.69-1.27-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.74 2.67 1.24 3.32.95.1-.74.4-1.24.73-1.52-2.56-.29-5.26-1.28-5.26-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.48.11-3.09 0 0 .96-.31 3.15 1.18a10.9 10.9 0 012.87-.39c.97 0 1.95.13 2.87.39 2.19-1.5 3.15-1.18 3.15-1.18.62 1.61.23 2.8.11 3.09.73.81 1.18 1.84 1.18 3.1 0 4.43-2.71 5.4-5.29 5.69.41.36.78 1.08.78 2.18 0 1.57-.01 2.84-.01 3.23 0 .3.21.66.79.55C20.71 21.38 24 17.08 24 12c0-6.27-5.23-11.5-12-11.5z" />
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="text-center sm:text-left">
            <h4 className="mb-4 font-semibold text-foreground">Product</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Features
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Security
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="text-center sm:text-left">
            <h4 className="mb-4 font-semibold text-foreground">Company</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Careers
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="text-center sm:text-left">
            <h4 className="mb-4 font-semibold text-foreground">Legal</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Terms
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-foreground/60 hover:text-primary transition">
                  Contact
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-black/10 pt-6 sm:pt-8">
          <p className="text-center text-xs text-foreground/50 sm:text-sm">
            © 2026 SentinelGuard AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
