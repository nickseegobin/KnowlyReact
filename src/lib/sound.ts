import { getSharedAudioContext } from './audioUnlock'

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.22,
) {
  if (typeof window === 'undefined') return
  try {
    const ctx = getSharedAudioContext()
    if (!ctx || ctx.state === 'suspended') return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(volume, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start()
    osc.stop(ctx.currentTime + duration)
  } catch {
    // AudioContext blocked or unavailable — silent fallback
  }
}

// G5 — 5th of C major, reinforces the Cadd9 resolution chord from useQuizAudio
export function soundCorrect() {
  playTone(784, 0.12, 'sine', 0.14)
}

// Bb4 — tritone within Edim, harmonically supports the wrong chord from useQuizAudio
export function soundWrong() {
  playTone(466, 0.18, 'sine', 0.11)
}

export function soundSelect() {
  playTone(520, 0.07, 'sine', 0.1)
}

// Replaced by playVictoryFanfare() — kept as a no-op so import sites don't break
export function soundComplete() {}  // eslint-disable-line @typescript-eslint/no-empty-function
