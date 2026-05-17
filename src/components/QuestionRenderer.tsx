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

// ── Math box (□) component — renders as a styled unknown placeholder ──────────

function MathBox() {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 border-2 border-current rounded-sm mx-0.5 align-middle text-xs font-bold"
      aria-label="unknown value"
    />
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

  // Plain text — split on newlines and replace □ with styled math boxes
  const lines = part.split('\n')
  return lines.map((line, i) => {
    const segments = line.split('□')
    return (
      <span key={`${key}-${i}`}>
        {segments.map((seg, j) => (
          <span key={j}>
            {seg}
            {j < segments.length - 1 && <MathBox />}
          </span>
        ))}
        {i < lines.length - 1 && <br />}
      </span>
    )
  })
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
