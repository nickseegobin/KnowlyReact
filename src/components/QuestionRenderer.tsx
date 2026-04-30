'use client'

import { useState } from 'react'

// ── [hide] word component ─────────────────────────────────────────────────────

function HideWord({ word }: { word: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <button
      type="button"
      onClick={() => setRevealed((r) => !r)}
      className={`inline-block cursor-pointer select-none rounded px-1.5 mx-0.5 font-medium
        transition-all duration-300 align-baseline leading-normal
        ${revealed
          ? 'bg-transparent text-base-content underline decoration-dashed underline-offset-2'
          : 'bg-base-content/80 text-base-content/80 hover:bg-base-content/60'
        }`}
      title={revealed ? 'Tap to hide' : 'Tap to reveal'}
      aria-label={revealed ? `Hide word: ${word}` : 'Reveal hidden word'}
    >
      {revealed ? word : '▓'.repeat(Math.min(word.length, 10))}
    </button>
  )
}

// ── [blank] component ─────────────────────────────────────────────────────────

function Blank() {
  return (
    <span
      className="inline-block border-b-2 border-base-content/60 min-w-[5rem] mx-1 text-center align-bottom"
      aria-label="blank"
    >
      &nbsp;
    </span>
  )
}

// ── Parser ────────────────────────────────────────────────────────────────────

const TAG_REGEX = /(\[emphasize\][\s\S]*?\[\/emphasize\]|\[hide\][\s\S]*?\[\/hide\]|\[blank\])/g

function renderSegment(part: string, key: number): React.ReactNode {
  if (part.startsWith('[emphasize]') && part.endsWith('[/emphasize]')) {
    return (
      <strong key={key} className="font-bold text-primary">
        {part.slice(11, -13)}
      </strong>
    )
  }
  if (part.startsWith('[hide]') && part.endsWith('[/hide]')) {
    return <HideWord key={key} word={part.slice(6, -7)} />
  }
  if (part === '[blank]') {
    return <Blank key={key} />
  }

  // Plain text — split on newlines so \n renders as <br />
  const lines = part.split('\n')
  return lines.map((line, i) => (
    <span key={`${key}-${i}`}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ))
}

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  text: string
  className?: string
}

export default function QuestionRenderer({ text, className = '' }: Props) {
  if (!text) return null

  const parts = text.split(TAG_REGEX)

  return (
    <span className={className}>
      {parts.map((part, i) => renderSegment(part, i))}
    </span>
  )
}
