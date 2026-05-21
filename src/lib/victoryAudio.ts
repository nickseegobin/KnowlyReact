'use client'

// ── Classical piece definitions ───────────────────────────────────────────────
// Each piece is a short 3-5 second victory snippet synthesised with a
// piano-like triangle-wave synth — distinct from the FM steel pan used during
// lesson/quiz play.  Rotates sequentially so no two completions in a row sound
// the same.

type NoteEvent = [string, string]   // [Tone.js note, duration string]

interface Piece {
  title: string
  bpm: number
  notes: NoteEvent[]
}

const PIECES: Piece[] = [
  {
    // Beethoven — Symphony No. 9, 4th movement (Ode to Joy), opening phrase
    title: 'Ode to Joy — Beethoven',
    bpm: 120,
    notes: [
      ['E4','4n'],['E4','4n'],['F4','4n'],['G4','4n'],
      ['G4','4n'],['F4','4n'],['E4','4n'],['D4','2n'],
    ],
  },
  {
    // Handel — Messiah, Hallelujah Chorus, opening soprano fanfare
    title: 'Hallelujah — Handel',
    bpm: 116,
    notes: [
      ['D5','8n'],['D5','8n'],['D5','4n'],['A5','8n'],['G5','8n'],
      ['F#5','4n'],['E5','4n'],['D5','2n'],
    ],
  },
  {
    // Mozart — Eine Kleine Nachtmusik K.525, Allegro, opening theme
    title: 'Eine Kleine Nachtmusik — Mozart',
    bpm: 140,
    notes: [
      ['G5','8n'],['F#5','8n'],['G5','8n'],['D5','8n'],
      ['B4','8n'],['G4','8n'],['D5','8n'],['B4','8n'],['G4','4n'],
      ['A4','8n'],['F#4','8n'],['D4','4n'],['A4','8n'],['F#4','8n'],['D4','2n'],
    ],
  },
  {
    // Vivaldi — The Four Seasons, Spring Op.8 No.1, opening violin melody
    title: 'Spring — Vivaldi',
    bpm: 126,
    notes: [
      ['E5','8n'],['E5','8n'],['E5','8n'],['C#5','8n'],['D5','4n'],['B4','4n'],
      ['E5','8n'],['E5','8n'],['E5','8n'],['D5','8n'],['C#5','2n'],
    ],
  },
  {
    // Bach — Minuet in G (Anna Magdalena Notebook, BWV Anh.114), opening phrase
    title: 'Minuet in G — Bach',
    bpm: 116,
    notes: [
      ['G4','4n'],['C5','4n'],['D5','8n'],['E5','8n'],['F5','4n'],['G5','4n'],
      ['A5','8n'],['G5','8n'],['F5','8n'],['E5','8n'],['D5','2n'],
    ],
  },
]

// ── Duration maths ────────────────────────────────────────────────────────────

function durSec(dur: string, bpm: number): number {
  const beat = 60 / bpm
  const map: Record<string, number> = {
    '1n': beat * 4, '2n': beat * 2, '2n.': beat * 3,
    '4n': beat,     '4n.': beat * 1.5,
    '8n': beat / 2, '8n.': beat * 0.75,
    '16n': beat / 4,
  }
  return map[dur] ?? beat
}

// ── Rotation state ────────────────────────────────────────────────────────────

let rotationIdx = 0

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Plays a short classical victory snippet using a piano-like Tone.js synth.
 * Rotates through 5 pieces (Beethoven, Handel, Mozart, Vivaldi, Bach) so each
 * quest completion sounds different.
 */
export async function playVictoryFanfare(): Promise<void> {
  const piece = PIECES[rotationIdx % PIECES.length]
  rotationIdx++

  try {
    const Tone = await import('tone')
    await Tone.start()

    // Warm triangle-wave piano — different character from the FM steel pan
    const reverb = new Tone.Reverb({ decay: 1.8, wet: 0.22 })
    const vol    = new Tone.Volume(-5)
    vol.connect(reverb)
    reverb.toDestination()

    const synth = new Tone.PolySynth(Tone.Synth)
    synth.set({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.002, decay: 0.3, sustain: 0.04, release: 2.0 },
    })
    synth.connect(vol)

    // Schedule every note
    const startAt = Tone.now() + 0.05
    let cursor = startAt
    for (const [note, dur] of piece.notes) {
      synth.triggerAttackRelease(note, dur, cursor)
      cursor += durSec(dur, piece.bpm)
    }

    // Dispose after the piece plus release tail
    const cleanupMs = (cursor - startAt + 1.5) * 1000
    setTimeout(() => {
      try { synth.dispose(); vol.dispose(); reverb.dispose() } catch { /* ignore */ }
    }, cleanupMs)
  } catch {
    // AudioContext blocked or Tone.js unavailable — silent fallback
  }
}
