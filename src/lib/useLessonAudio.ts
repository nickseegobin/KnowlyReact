'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PolySynth, FMSynth } from 'tone'

// ── Chord engine ──────────────────────────────────────────────────────────────

function getProgression(n: number): string[] {
  if (n <= 0) return []
  if (n === 1) return ['C']
  if (n === 2) return ['Bdim', 'C']
  const minors = ['Am', 'Dm', 'Em', 'Gm', 'Bm']
  return [...minors.slice(0, n - 2), 'Bdim', 'C']
}

// Maps chord names to note arrays
const CHORD_MAP: Record<string, string[]> = {
  Am:   ['A3', 'C4', 'E4'],
  Dm:   ['D3', 'F3', 'A3'],
  Em:   ['E3', 'G3', 'B3'],
  Gm:   ['G3', 'Bb3', 'D4'],
  Bm:   ['B3', 'D4', 'F#4'],
  Bdim: ['B3', 'D4', 'F4'],
  C:    ['C4', 'E4', 'G4'],
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLessonAudio(totalSlides: number) {
  const synthRef = useRef<PolySynth<FMSynth> | null>(null)

  // Dispose synth on unmount
  useEffect(() => {
    return () => {
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [])

  const playSlideChord = useCallback(async (slideIndex: number) => {
    // Dynamic import keeps Tone.js out of the SSR bundle
    const Tone = await import('tone')

    // First call: start audio context + build the synth chain
    if (!synthRef.current) {
      await Tone.start()

      // FMSynth → Volume → Reverb → Destination
      const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.4 })
      const vol    = new Tone.Volume(-12)
      vol.connect(reverb)
      reverb.toDestination()

      // FMSynth for steel pan-like metallic shimmer
      const synth = new Tone.PolySynth(Tone.FMSynth)
      synth.set({
        harmonicity:        3.01,
        modulationIndex:    14,
        oscillator:         { type: 'triangle' as const },
        envelope:           { attack: 0.02, decay: 0.3,  sustain: 0.2, release: 1.5 },
        modulation:         { type: 'square' as const },
        modulationEnvelope: { attack: 0.2,  decay: 0.3,  sustain: 0.5, release: 0.8 },
      })
      synth.connect(vol)
      synthRef.current = synth
    }

    const chordName = getProgression(totalSlides)[slideIndex]
    if (!chordName) return
    const notes = CHORD_MAP[chordName]
    if (!notes?.length) return

    // Half-note duration — ~1.5s at default 120bpm
    synthRef.current.triggerAttackRelease(notes, '2n')
  }, [totalSlides])

  return { playSlideChord }
}
