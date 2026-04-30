export function haptic(pattern: number | number[]) {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

export const HAPTIC_CORRECT    = 50
export const HAPTIC_WRONG      = [50, 50, 90]
export const HAPTIC_SELECT     = 20
export const HAPTIC_COMPLETE   = [100, 50, 100, 50, 200]
