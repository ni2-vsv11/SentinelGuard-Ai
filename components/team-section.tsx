'use client'

import { Users } from 'lucide-react'

import { BrandLogo } from '@/components/brand-logo'

export function TeamSection() {
  const teamMembers = [
    {
      name: 'Nitesh Vasave',
      role: 'AI Software Developer',
      description: 'Architecting AI-powered systems',
      linkedin: 'https://www.linkedin.com/in/nitesh-vasave',
    },
    {
      name: 'Varun Patil',
      role: 'ML Engineer',
      description: 'Creating intelligent machine learning models',
      linkedin: 'https://www.linkedin.com/in/varun-patil-a523b428a/',
    },
    {
      name: 'Shravani Bhosekar',
      role: 'UI Designer',
      description: 'Designing modern user interfaces',
      linkedin: 'https://www.linkedin.com/in/shravani-bhosekar-37b4b2320/',
    },
  ]

  return (
    <section id="team" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
      <div className="mb-10 text-center sm:mb-12">
        <div className="mb-4 flex justify-center">
          <BrandLogo className="h-10 w-10 text-primary" />
        </div>
        <h2 className="mb-4 text-3xl font-bold sm:text-4xl">Designed by Team-CodeX</h2>
        <p className="mx-auto max-w-2xl text-base text-foreground/60 sm:text-lg">
          A specialized unit dedicated to pioneering AI-driven cybersecurity solutions at the intersection of machine learning and human creativity
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member, index) => (
          <div
            key={index}
            className="glass-panel rounded-xl p-6 text-center transition hover:border-primary/45 sm:p-8"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-black/10 bg-white/82">
              <Users size={32} className="text-primary" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-1">
              {member.linkedin ? (
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {member.name}
                </a>
              ) : (
                member.name
              )}
            </h3>
            <p className="text-primary text-sm font-semibold mb-3">{member.role}</p>
            <p className="text-foreground/60 text-sm">{member.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
