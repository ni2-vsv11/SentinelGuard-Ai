import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SentinelGuard AI - Phishing Detection System',
  description: 'Detect phishing emails & malicious URLs in real-time with advanced neural network architecture.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-background text-foreground overflow-x-hidden antialiased">
        {children}
      </body>
    </html>
  )
}
