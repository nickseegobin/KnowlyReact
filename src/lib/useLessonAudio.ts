'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { PolySynth, FMSynth } from 'tone'

// ── Settings types ────────────────────────────────────────────────────────────

type WaveType = 'sine' | 'triangle' | 'square' | 'sawtooth'
type NoteDuration = '32n' | '16n' | '8n' | '4n' | '2n' | '1n'

interface EnvelopeSettings {
  attack: number
  decay: number
  sustain: number
  release: number
}

interface SoundSettings {
  enabled: boolean
  harmonicity: number
  modulationIndex: number
  oscillatorType: WaveType
  modulationType: WaveType
  envelope: EnvelopeSettings
  modulationEnvelope: EnvelopeSettings
  volume: number
  reverbDecay: number
  reverbWet: number
  noteDuration: NoteDuration
  arpDelay: number
}

const DEFAULTS: SoundSettings = {
  enabled:         true,
  harmonicity:     5.1,
  modulationIndex: 20,
  oscillatorType:  'sine',
  modulationType:  'sine',
  envelope:            { attack: 0.001, decay: 0.5,  sustain: 0.0, release: 1.0 },
  modulationEnvelope:  { attack: 0.001, decay: 0.15, sustain: 0.0, release: 0.3 },
  volume:       -10,
  reverbDecay:  2.0,
  reverbWet:    0.35,
  noteDuration: '4n',
  arpDelay:     0.08,
}

// Module-level cache — fetched once per page load, shared across all hook instances
let cachedSettings: SoundSettings | null = null
let settingsPromise: Promise<SoundSettings> | null = null

export async function loadSettings(): Promise<SoundSettings> {
  if (cachedSettings) return cachedSettings
  if (!settingsPromise) {
    settingsPromise = fetch('/api/sound-design')
      .then((r) => (r.ok ? r.json() : DEFAULTS))
      .then((data: Partial<SoundSettings>) => {
        cachedSettings = { ...DEFAULTS, ...data }
        return cachedSettings
      })
      .catch(() => {
        cachedSettings = DEFAULTS
        return cachedSettings
      })
  }
  return settingsPromise
}

// ── Chord engine ──────────────────────────────────────────────────────────────

// Hopeful, whimsical journey — all major/sus/maj7, resolving to C on the last slide.
// n=2: G→C   n=3: Fmaj7→G→C   n=4: Fmaj7→D→G→C   etc.
function getProgression(n: number): string[] {
  if (n <= 0) return []
  if (n === 1) return ['C']
  if (n === 2) return ['G', 'C']
  const colors = ['Fmaj7', 'D', 'Asus2', 'E', 'Cmaj7']
  return [...colors.slice(0, n - 2), 'G', 'C']
}

const CHORD_MAP: Record<string, string[]> = {
  Fmaj7: ['F3', 'A3', 'E4'],   // dreamy, warm
  D:     ['D3', 'F#3', 'A3'],  // sunlit, bright
  Asus2: ['A3', 'B3', 'E4'],   // airy, open
  E:     ['E3', 'G#3', 'B3'],  // bright, surprising
  Cmaj7: ['C4', 'E4', 'B4'],   // near-resolution, ethereal
  G:     ['G3', 'B3', 'D4'],   // dominant — pulls to C
  C:     ['C4', 'E4', 'G4'],   // resolution
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLessonAudio(totalSlides: number) {
  const synthRef = useRef<PolySynth<FMSynth> | null>(null)

  useEffect(() => {
    return () => {
      synthRef.current?.dispose()
      synthRef.current = null
    }
  }, [])

  const playSlideChord = useCallback(async (slideIndex: number) => {
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

    const chordName = getProgression(totalSlides)[slideIndex]
    if (!chordName) return
    const notes = CHORD_MAP[chordName]
    if (!notes?.length) return

    const now = Tone.now()
    notes.forEach((note, i) => {
      synthRef.current!.triggerAttackRelease(note, settings.noteDuration, now + i * settings.arpDelay)
    })
  }, [totalSlides])

  return { playSlideChord }
}
