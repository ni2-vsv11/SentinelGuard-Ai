'use client'

export function Footer() {
  return (
    <footer className="border-t border-black/10 bg-white/62 backdrop-blur-md backdrop-saturate-150">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-foreground mb-4">SentinelGuard AI</h3>
            <p className="text-sm text-foreground/60">
              Advanced AI-powered phishing detection and cybersecurity protection
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
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
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
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
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
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
        <div className="border-t border-black/10 pt-8">
          <p className="text-sm text-foreground/50 text-center">
            © 2024 SentinelGuard AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
