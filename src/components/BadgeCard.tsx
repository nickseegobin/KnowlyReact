'use client'

import { useState } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import { injectPeriodColors, DEFAULT_BADGE_SVG } from '@/lib/badgeSvg'

export interface BadgeAward {
  id: number
  definition_id: number
  name: string
  description: string
  trigger_type: 'quest_module_completion' | 'trial_count' | 'lesson_count'
  subject: string
  period: string | null
  level: string
  svg_markup: string | null
  awarded_at: string
  share_token: string
}

interface Props {
  award: BadgeAward
  shareBaseUrl: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

const TRIGGER_LABEL: Record<BadgeAward['trigger_type'], string> = {
  quest_module_completion: 'Quest',
  trial_count:             'Trials',
  lesson_count:            'Lessons',
}

export default function BadgeCard({ award, shareBaseUrl }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl  = `${shareBaseUrl}/badge/${award.share_token}`
  const svgSource = award.svg_markup || DEFAULT_BADGE_SVG
  const svgFinal  = injectPeriodColors(svgSource, award.period)

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: award.name,
          text:  `Check out my "${award.name}" badge on Knowly!`,
          url:   shareUrl,
        })
        return
      } catch { /* user cancelled or not supported — fall through */ }
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="flex flex-col items-center gap-3 bg-base-200 rounded-2xl p-5 text-center">
      <div
        className="w-24 h-24"
        dangerouslySetInnerHTML={{ __html: svgFinal }}
        aria-hidden="true"
      />

      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-sm leading-snug">{award.name}</p>
        {award.description && (
          <p className="text-xs text-base-content/55 leading-snug">{award.description}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-base-content/40">
        <span className="badge badge-xs badge-ghost">{TRIGGER_LABEL[award.trigger_type]}</span>
        <span>·</span>
        <span>{formatDate(award.awarded_at)}</span>
      </div>

      <button
        onClick={handleShare}
        className="btn btn-xs btn-ghost gap-1.5 text-base-content/50 hover:text-base-content"
        title="Share badge"
      >
        {copied ? <Check size={13} className="text-success" /> : <Share2 size={13} />}
        {copied ? 'Copied!' : 'Share'}
      </button>
    </div>
  )
}
