'use client'

import { Fragment, useState } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'

// ── Animation variants ─────────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.028 } },
}

// Word-by-word: fade up from y:10
const wordVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
  },
}

// [emphasize]: same fade-up entrance, then a subtle breathing scale pulse after
// the stagger finishes (~0.6s delay covers most question lengths at 28ms/word)
const emphVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 1 },
  visible: {
    opacity: 1,
    y: 0,
    scale: [1, 1, 1.06, 1],
    transition: {
      opacity: { duration: 0.2, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
      y:       { duration: 0.2, ease: [0.2, 0, 0, 1] as [number, number, number, number] },
      scale: {
        delay: 0.62,
        duration: 0.55,
        times: [0, 0.75, 0.88, 1],
        ease: 'easeInOut',
        repeat: Infinity,
        repeatDelay: 2.8,
      },
    },
  },
}

// Pop spring for [hide], [blank], □ tokens
const popVariants: Variants = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 600, damping: 18, mass: 0.8 },
  },
}

// ── Sub-components (pure UI, no motion) ────────────────────────────────────────

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

function MathBox() {
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 border-2 border-current rounded-sm mx-0.5 align-middle text-xs font-bold"
      aria-label="unknown value"
    />
  )
}

// ── Tokenizer ──────────────────────────────────────────────────────────────────

type Token =
  | { type: 'word';     text: string }
  | { type: 'space';    text: string }  // preserved whitespace between/around tags
  | { type: 'emphasize'; text: string }
  | { type: 'hide';     word: string }
  | { type: 'blank' }
  | { type: 'mathbox' }
  | { type: 'break' }

const TAG_REGEX = /(\[emphasize\][\s\S]*?\[\/emphasize\]|\[hide\][\s\S]*?\[\/hide\]|\[blank\])/g

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const parts = text.split(TAG_REGEX)

  for (const part of parts) {
    if (!part) continue

    if (part.startsWith('[emphasize]') && part.endsWith('[/emphasize]')) {
      // [/emphasize] is 12 chars; [emphasize] is 11
      tokens.push({ type: 'emphasize', text: part.slice(11, -12) })
    } else if (part.startsWith('[hide]') && part.endsWith('[/hide]')) {
      // [/hide] is 7 chars; [hide] is 6
      tokens.push({ type: 'hide', word: part.slice(6, -7) })
    } else if (part === '[blank]') {
      tokens.push({ type: 'blank' })
    } else {
      // Plain text: split on newlines, then on □, then split into word/space segments.
      // Using split(/(\s+)/) preserves all whitespace — including the leading space that
      // follows a closing tag like "[/emphasize] next word".
      const lines = part.split('\n')
      lines.forEach((line, lineIdx) => {
        if (lineIdx > 0) tokens.push({ type: 'break' })
        const mathParts = line.split('□')
        mathParts.forEach((mathPart, mathIdx) => {
          if (mathIdx > 0) tokens.push({ type: 'mathbox' })
          const segments = mathPart.split(/(\s+)/).filter(s => s !== '')
          for (const seg of segments) {
            tokens.push(/^\s+$/.test(seg) ? { type: 'space', text: seg } : { type: 'word', text: seg })
          }
        })
      })
    }
  }

  return tokens
}

// ── Token → JSX ───────────────────────────────────────────────────────────────

function renderTokenUI(token: Token): React.ReactNode {
  switch (token.type) {
    case 'word':      return token.text
    case 'space':     return token.text
    case 'emphasize': return <strong className="font-bold text-primary">{token.text}</strong>
    case 'hide':      return <HideWord word={token.word} />
    case 'blank':     return <Blank />
    case 'mathbox':   return <MathBox />
    case 'break':     return <br />
  }
}

// ── Public component ───────────────────────────────────────────────────────────

interface Props {
  text: string
  className?: string
  /**
   * When true, questions appear word-by-word with a staggered fade-up entrance.
   * [emphasize] tokens additionally pulse gently after the stagger settles.
   * Use on question text only — do NOT set on answer option labels.
   */
  splitAnimate?: boolean
}

export default function QuestionRenderer({ text, className = '', splitAnimate = false }: Props) {
  const prefersReducedMotion = useReducedMotion()

  if (!text) return null

  const tokens = tokenize(text)

  // ── Reduced motion: plain render, zero animation ──────────────────────────
  if (prefersReducedMotion) {
    return (
      <span className={className}>
        {tokens.map((token, i) =>
          token.type === 'break'
            ? <br key={i} />
            : <Fragment key={i}>{renderTokenUI(token)}</Fragment>
        )}
      </span>
    )
  }

  // ── Split animate: word-by-word stagger; [emphasize] pulses after ─────────
  if (splitAnimate) {
    return (
      <motion.span
        className={className}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {tokens.map((token, i) => {
          // Space and break tokens: plain text, not part of the stagger
          if (token.type === 'break') return <Fragment key={i}><br /></Fragment>
          if (token.type === 'space') return <Fragment key={i}>{token.text}</Fragment>

          const isSpecial = token.type === 'blank' || token.type === 'mathbox' || token.type === 'hide'
          const variants =
            token.type === 'emphasize' ? emphVariants :
            isSpecial                  ? popVariants  :
                                         wordVariants

          return (
            <motion.span
              key={i}
              variants={variants}
              style={{ display: 'inline-block' }}
            >
              {renderTokenUI(token)}
            </motion.span>
          )
        })}
      </motion.span>
    )
  }

  // ── Standard: special tokens pop in on mount; everything else plain ───────
  return (
    <span className={className}>
      {tokens.map((token, i) => {
        if (token.type === 'break') return <br key={i} />
        if (token.type === 'space') return <Fragment key={i}>{token.text}</Fragment>
        const isSpecial = token.type === 'blank' || token.type === 'mathbox' || token.type === 'hide'
        if (isSpecial) {
          return (
            <motion.span
              key={i}
              initial="hidden"
              animate="visible"
              variants={popVariants}
              style={{ display: 'inline-block' }}
            >
              {renderTokenUI(token)}
            </motion.span>
          )
        }
        return <Fragment key={i}>{renderTokenUI(token)}</Fragment>
      })}
    </span>
  )
}
