// Shared singleton AudioContext — reused by sound.ts so iOS doesn't see a fresh
// suspended context on each playTone call.
let sharedCtx: AudioContext | null = null

export function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!sharedCtx) sharedCtx = new AudioContext()
  return sharedCtx
}

// Called once on first user gesture (touchstart / click) from ChildLayout.
// Resumes the raw context AND starts Tone.js — after this, all scheduled
// sounds work regardless of whether they fire inside a gesture or not.
export async function unlockAudio(): Promise<void> {
  try {
    const ctx = getSharedAudioContext()
    if (ctx?.state === 'suspended') await ctx.resume()
    const Tone = await import('tone')
    await Tone.start()
  } catch { /* ignore */ }
}
