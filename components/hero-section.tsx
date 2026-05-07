'use client'

export function HeroSection() {
  return (
    <section id="home" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-12">
        {/* Left Side */}
        <div className="space-y-5 text-center md:text-left lg:space-y-6">
          <div className="inline-block rounded-full border border-black/10 bg-white/68 px-4 py-2 backdrop-blur-sm backdrop-saturate-150">
            <span className="text-sm font-semibold text-primary">Next-Gen Security</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            AI-Based <br className="hidden sm:block" />
            <span className="gradient-text">Phishing Detection</span> <br className="hidden sm:block" />
            System
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-foreground/70 sm:text-lg md:mx-0">
            Detect phishing emails & malicious URLs in real-time with our advanced neural network architecture. Secure your digital assets before threats emerge.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <button className="rounded-xl bg-primary px-8 py-3 font-semibold text-white transition hover:bg-secondary">
              Check Now
            </button>
            <button className="rounded-xl border border-black/15 px-8 py-3 font-semibold text-foreground transition hover:bg-white/70">
              How it Works
            </button>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex justify-center">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-2 sm:p-3">
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              src="/assets/cyber-phishing.mp4"
              className="aspect-video w-full rounded-xl bg-slate-950 object-cover [transform:translateZ(0)]"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
