'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PolySynth, FMSynth } from 'tone'
import { loadSettings } from './useLessonAudio'

// ── Chord pools ───────────────────────────────────────────────────────────────

// Mysterious, intriguing — rotates by question index so no two consecutive
// questions play the same chord.
const MYSTERY: string[][] = [
  ['A3', 'C4', 'E4'],   // Am  — wistful
  ['E3', 'G3', 'B3'],   // Em  — ethereal
  ['D3', 'F3', 'A3'],   // Dm  — melancholic
  ['B3', 'D4', 'F#4'],  // Bm  — questioning
]

// Tense, dissonant — alternates so repeated wrong answers vary slightly.
const WRONG: string[][] = [
  ['B3', 'D4', 'F4'],   // Bdim — classic tension
  ['E3', 'G3', 'Bb3'],  // Edim — tritone bite
]

// Bright resolution with an added 9th — more celebratory than the plain C triad.
const CORRECT: string[] = ['C4', 'E4', 'G4', 'D5']  // Cadd9

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useQuizAudio() {
  const synthRef = useRef<PolySynth<FMSynth> | null>(null)

  useEffect(() => {
    return () => { synthRef.current?.dispose(); synthRef.current = null }
  }, [])

  // Lazily builds the synth on first call, then reuses it.
  const fire = useCallback(async (notes: string[]) => {
    const settings = await loadSettings()
    if (!settings.enabled) return

    const Tone = await import('tone')

    if (!synthRef.current) {
      await Tone.start()

      const reverb = new Tone.Reverb({ decay: settings.reverbDecay, wet: settings.reverbWet })
      const vol    = new Tone.Volume(settings.volume)
      vol.connect(reverb)
      reverb.toDestination()

      const synth = new Tone.PolySynth(Tone.FMSynth)
      synth.set({
        harmonicity:        settings.harmonicity,
        modulationIndex:    settings.modulationIndex,
        oscillator:         { type: settings.oscillatorType },
        envelope:           settings.envelope,
        modulation:         { type: settings.modulationType },
        modulationEnvelope: settings.modulationEnvelope,
      })
      synth.connect(vol)
      synthRef.current = synth
    }

    const now = Tone.now()
    notes.forEach((note, i) =>
      synthRef.current!.triggerAttackRelease(note, settings.noteDuration, now + i * settings.arpDelay)
    )
  }, [])

  // index rotates through the mystery pool — different chord each question.
  const playQuestion = useCallback((index: number) =>
    fire(MYSTERY[index % MYSTERY.length]), [fire])

  // Cadd9 — bright, sparkly resolution.
  const playCorrect = useCallback(() =>
    fire(CORRECT), [fire])

  // index alternates the wrong chord so back-to-back wrong answers vary.
  const playWrong = useCallback((index: number) =>
    fire(WRONG[index % WRONG.length]), [fire])

  return { playQuestion, playCorrect, playWrong }
}
