'use client'

import { useMemo } from 'react'
import type { AudioMark, LottieTag, LottieMarker, TagEvent } from '@/types/knowly'
import type { Section } from '@/components/child/LessonPlayer'

// ── Tag parsing helpers ───────────────────────────────────────────────────────

const TAG_RE = /\[(start|next|m\d+|break)\]/gi

/**
 * Strip all inline director tags from text before rendering.
 * Collapses the double-space left behind each removed tag.
 */
export function stripLottieTags(text: string): string {
  return text.replace(TAG_RE, '').replace(/  +/g, ' ').trim()
}

/** Tokenise raw paragraph text into alternating word/tag tokens. */
function tokenize(text: string): string[] {
  // Pad every tag with spaces so adjacent non-whitespace (e.g. "rule.[break]") never
  // gets absorbed into the greedy \S+ alternative.
  const normalized = text.replace(/(\[(?:start|next|m\d+|break)\])/gi, ' $1 ')
  return Array.from(normalized.matchAll(/\[(start|next|m\d+|break)\]|\S+/gi), (m) => m[0])
}

function isLottieToken(token: string): boolean {
  return /^\[(start|next|m\d+)\]$/i.test(token)
}

function isBreakToken(token: string): boolean {
  return /^\[break\]$/i.test(token)
}

function isTagToken(token: string): boolean {
  return isLottieToken(token) || isBreakToken(token)
}

/**
 * Parse all Lottie tag events for one paragraph.
 *
 * Each tag fires at the timestamp of the word immediately following it in the
 * explanation text. [next] tags are expanded in order: first [next] → m1,
 * second → m2, and so on. [break] tags are ignored here — see parseSentenceBreaks.
 *
 * Assumes marks[] was generated from the same text with all tags stripped.
 *
 * Exported for unit testing in /debug/spec.
 */
export function parseTagEvents(rawText: string, marks: AudioMark[]): TagEvent[] {
  const tokens: string[] = tokenize(rawText)
  const events: TagEvent[] = []

  let wordsSeen = 0
  let nextCount = 0

  for (const token of tokens) {
    if (isLottieToken(token)) {
      const mark = marks[wordsSeen]
      if (!mark) continue

      const lower = token.toLowerCase() as LottieTag
      let marker: LottieMarker

      if (lower === '[start]') {
        marker = 'm1'
      } else if (lower === '[next]') {
        nextCount++
        marker = `m${Math.min(nextCount, 10)}` as LottieMarker
      } else {
        marker = lower.slice(1, -1) as LottieMarker  // '[m2]' → 'm2'
      }

      events.push({ tag: lower, marker, triggerTime: mark.time })
    } else if (!isTagToken(token)) {
      // [break] and other non-tag tokens don't increment wordsSeen for Lottie,
      // but [break] is also a tag so it's handled by the else-if above.
      wordsSeen++
    }
    // [break] tokens: not a Lottie event, not a word — skip without incrementing
  }

  return events
}

export interface BreakEvent {
  triggerTime: number
}

/**
 * Parse [break] events for one paragraph.
 * Each [break] fires at the timestamp of the word immediately following it,
 * causing the display to advance to the next sentence chunk.
 */
export function parseSentenceBreaks(rawText: string, marks: AudioMark[]): BreakEvent[] {
  const tokens: string[] = tokenize(rawText)
  const breaks: BreakEvent[] = []
  let wordsSeen = 0

  for (const token of tokens) {
    if (isBreakToken(token)) {
      const mark = marks[wordsSeen]
      if (mark) breaks.push({ triggerTime: mark.time })
    } else if (!isTagToken(token)) {
      wordsSeen++
    }
    // Lottie tokens: not a word, not a break — skip without incrementing
  }

  return breaks
}

/** Split raw text on [break] tags into sentence chunks (tags preserved within each chunk). */
function splitOnBreaks(rawText: string): string[] {
  return rawText.split(/\[break\]/gi).map(s => s.trim()).filter(Boolean)
}

// ── Stable empty fallbacks ────────────────────────────────────────────────────

const EMPTY_MARKS: AudioMark[] = []
const EMPTY_EVENTS: TagEvent[] = []
const EMPTY_BREAKS: BreakEvent[] = []

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseDirectorResult {
  /** Section has lottie_url → render in Mode 2 (Lottie + subtitle strip) */
  hasLottie: boolean
  /** Current paragraph has word-timing marks → sync is active */
  hasMarks: boolean
  /**
   * The most recent TagEvent whose triggerTime ≤ audioCurrentTimeMs.
   * DirectorLottiePanel seeks the Lottie animation to event.marker when this changes.
   */
  activeLottieCommand: TagEvent | null
  /** Explanation text for the current sentence chunk, with all tags stripped. */
  displayText: string
  /** All resolved TagEvents for the current paragraph. */
  tagEvents: TagEvent[]
  /**
   * Which sentence chunk within the paragraph is currently active.
   * Advances automatically as [break] triggerTimes are crossed.
   * Used as part of the key for QuestionRenderer to re-trigger split animation.
   */
  activeSentenceIdx: number
}

/**
 * Drives the Synced Viewer for one section + paragraph.
 *
 * @param section            The current Section (null while data loads).
 * @param paraIdx            0-based paragraph index within the section.
 * @param audioCurrentTimeMs Audio playback position in milliseconds.
 */
export function useDirector(
  section: Section | null,
  paraIdx: number,
  audioCurrentTimeMs: number,
): UseDirectorResult {
  const hasLottie = Boolean(section?.lottie_url)
  const marks     = section?.explanation_marks?.[paraIdx] ?? EMPTY_MARKS
  const hasMarks  = marks.length > 0
  const rawText   = section?.explanation?.[paraIdx] ?? ''

  // Sentence chunks split on [break] — each retains its own Lottie tags
  const sentences = useMemo(() => splitOnBreaks(rawText) || [rawText], [rawText])

  const sentenceBreaks = useMemo(
    () => (hasMarks && rawText ? parseSentenceBreaks(rawText, marks) : EMPTY_BREAKS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawText, marks, hasMarks],
  )

  const tagEvents = useMemo(
    () => (hasMarks && rawText ? parseTagEvents(rawText, marks) : EMPTY_EVENTS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawText, marks, hasMarks],
  )

  // How many sentence breaks have fired → which sentence to show
  const activeSentenceIdx = useMemo(() => {
    let idx = 0
    for (const brk of sentenceBreaks) {
      if (brk.triggerTime <= audioCurrentTimeMs) idx++
      else break
    }
    return Math.min(idx, sentences.length - 1)
  }, [sentenceBreaks, audioCurrentTimeMs, sentences.length])

  const displayText = useMemo(
    () => stripLottieTags(sentences[activeSentenceIdx] ?? ''),
    [sentences, activeSentenceIdx],
  )

  const activeLottieCommand = useMemo<TagEvent | null>(() => {
    let last: TagEvent | null = null
    for (const ev of tagEvents) {
      if (ev.triggerTime <= audioCurrentTimeMs) last = ev
      else break
    }
    return last
  }, [tagEvents, audioCurrentTimeMs])

  return { hasLottie, hasMarks, activeLottieCommand, displayText, tagEvents, activeSentenceIdx }
}
