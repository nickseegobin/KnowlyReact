'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import type { TagEvent } from '@/types/knowly'

// Time (ms) to wait after 'load' before accepting commands.
// Gives WASM first-frame decode time to settle before we seek.
const READY_BUFFER_MS = 600

// ── Marker segment parsing ────────────────────────────────────────────────────
// AE composition markers default to dr=0 (zero duration). setMarker(name)
// computes end = tm + dr = tm + 0 = tm, so start === end → dotlottie falls back
// to playing the full animation. We bypass this by computing each marker's end
// as the following marker's start frame instead.

interface Segment { start: number; end: number }

function parseSegments(json: { markers?: { tm: number; cm: string }[]; op?: number }): Record<string, Segment> {
  const markers = json.markers ?? []
  const totalFrames = json.op ?? 0
  const result: Record<string, Segment> = {}
  markers.forEach((m, i) => {
    // AE/Bodymovin sometimes exports marker names with trailing \r — strip all whitespace.
    result[m.cm.trim()] = {
      start: Math.round(m.tm),
      end:   Math.round(markers[i + 1]?.tm ?? totalFrames),
    }
  })
  return result
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  src: string
  activeLottieCommand: TagEvent | null
}

export default function DirectorLottiePanel({ src, activeLottieCommand }: Props) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null)

  // All refs so closures inside timeouts/callbacks always see fresh values.
  const isReadyRef   = useRef(false)
  const pendingRef   = useRef<TagEvent | null>(null)
  const segmentsRef  = useRef<Record<string, Segment>>({})

  // Pre-fetch the JSON to parse per-marker frame ranges.
  useEffect(() => {
    isReadyRef.current  = false
    segmentsRef.current = {}
    fetch(src)
      .then(r => r.json())
      .then(json => {
        const segs = parseSegments(json)
        segmentsRef.current = segs
        console.log('[Lottie] segments:', segs)
      })
      .catch(err => console.error('[Lottie] segment parse failed:', err))
  }, [src])

  const applyCommand = useCallback((dl: DotLottie, cmd: TagEvent) => {
    const seg = segmentsRef.current[cmd.marker]
    if (!seg) {
      console.warn(`[Lottie] marker not found: "${cmd.marker}" | known:`, Object.keys(segmentsRef.current))
      return
    }
    // Do NOT call stop() — it resets to absolute frame 0 before setSegment takes
    // effect, causing a one-frame flash at frame 0 between segments.
    // play() after setSegment() seeks to the new segment's start frame directly.
    dl.setLoop(cmd.loop)
    dl.setSegment(seg.start, seg.end)
    dl.play()
    console.log(`[Lottie] ▶ ${cmd.marker}${cmd.loop ? ' (loop)' : ''} frames=${seg.start}–${seg.end}`)
  }, [])

  // Wire animation lifecycle events once we have the player instance.
  useEffect(() => {
    if (!dotLottie) return

    const onLoad = () => {
      console.log(`[Lottie] load — buffering ${READY_BUFFER_MS}ms`)
      setTimeout(() => {
        isReadyRef.current = true
        console.log('[Lottie] ✓ ready | segments:', Object.keys(segmentsRef.current))
        if (pendingRef.current) {
          applyCommand(dotLottie, pendingRef.current)
          pendingRef.current = null
        }
      }, READY_BUFFER_MS)
    }

    const onComplete = () => {
      console.log('[Lottie] ✓ segment complete — holding')
    }

    dotLottie.addEventListener('load', onLoad)
    dotLottie.addEventListener('complete', onComplete)

    return () => {
      dotLottie.removeEventListener('load', onLoad)
      dotLottie.removeEventListener('complete', onComplete)
    }
  }, [dotLottie, applyCommand])

  // React to incoming commands from the Director.
  useEffect(() => {
    if (!dotLottie || !activeLottieCommand) return
    if (!isReadyRef.current) {
      console.log(`[Lottie] queued (loading): ${activeLottieCommand.marker}`)
      pendingRef.current = activeLottieCommand
      return
    }
    applyCommand(dotLottie, activeLottieCommand)
  }, [dotLottie, activeLottieCommand, applyCommand])

  return (
    <DotLottieReact
      src={src}
      autoplay={false}
      loop={false}
      dotLottieRefCallback={(dl) => setDotLottie(dl)}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
