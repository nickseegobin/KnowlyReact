'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Props {
  continueTopic?: string
  continueSubject?: string
  continueScore?: number | null
  subjectLabel?: string
}

const CARDS = [
  {
    key:   'quests',
    label: 'Quest Path',
    title: 'Ready to learn?',
    desc:  'Follow your curriculum path and earn gems.',
    cta:   'Start a Quest →',
    href:  '/child/quests',
    bg:    'bg-primary',
    dot:   'bg-primary-content',
  },
  {
    key:   'trials',
    label: 'Practice Mode',
    title: 'Test your knowledge',
    desc:  'Take a quick trial and track your score.',
    cta:   'Start a Trial →',
    href:  '/child/trials',
    bg:    'bg-warning',
    dot:   'bg-warning-content',
  },
  {
    key:   'lessons',
    label: 'Lesson Time',
    title: 'Study at your pace',
    desc:  'Explore any topic whenever you\'re ready.',
    cta:   'Pick a Lesson →',
    href:  '/child/lessons',
    bg:    'bg-info',
    dot:   'bg-info-content',
  },
] as const

export default function RotatingCTA({ continueTopic, continueSubject, continueScore, subjectLabel }: Props) {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (continueTopic) return
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx((i) => (i + 1) % CARDS.length)
        setVisible(true)
      }, 300)
    }, 4500)
    return () => clearInterval(interval)
  }, [continueTopic])

  if (continueTopic) {
    return (
      <Link
        href={`/child/quests/${continueSubject ?? ''}`}
        className="rounded-2xl bg-primary text-primary-content p-5 flex flex-col gap-3 hover:opacity-90 transition-opacity"
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-content/60">
            Continue Quest · {subjectLabel ?? continueSubject}
          </p>
          <p className="font-semibold text-lg leading-snug">{continueTopic}</p>
        </div>
        <div className="w-full bg-primary-content/20 rounded-full h-1.5">
          <div
            className="bg-primary-content rounded-full h-1.5"
            style={{ width: `${Math.min(100, Math.round(continueScore ?? 40))}%` }}
          />
        </div>
        <span className="self-start px-4 py-2 rounded-xl bg-primary-content text-primary text-sm font-semibold">
          Continue →
        </span>
      </Link>
    )
  }

  const card = CARDS[idx]

  return (
    <div className="relative">
      <Link
        href={card.href}
        className={`rounded-2xl ${card.bg} text-primary-content p-5 flex flex-col gap-3 hover:opacity-90 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`}
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-content/60">{card.label}</p>
          <p className="font-semibold text-lg">{card.title}</p>
          <p className="text-sm text-primary-content/70">{card.desc}</p>
        </div>
        <span className="self-start px-4 py-2 rounded-xl bg-primary-content text-primary text-sm font-semibold">
          {card.cta}
        </span>
      </Link>

      {/* Dots */}
      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {CARDS.map((c, i) => (
          <button
            key={c.key}
            onClick={(e) => { e.preventDefault(); setIdx(i); setVisible(true) }}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-primary-content w-3' : 'bg-primary-content/40'}`}
          />
        ))}
      </div>
    </div>
  )
}
