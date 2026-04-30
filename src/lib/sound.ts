function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.22,
) {
  if (typeof window === 'undefined') return
  try {
    const ctx = new AudioContext()
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

export function soundCorrect() {
  playTone(880, 0.15)
}

export function soundWrong() {
  playTone(200, 0.28, 'sawtooth', 0.18)
}

export function soundSelect() {
  playTone(520, 0.07, 'sine', 0.1)
}

export function soundComplete() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.35, 'sine', 0.2), i * 110))
}
