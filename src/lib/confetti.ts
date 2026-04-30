// Dynamic import keeps canvas-confetti out of the SSR bundle entirely.

async function fire(options: Record<string, unknown>) {
  const mod = await import('canvas-confetti')
  mod.default(options as Parameters<typeof mod.default>[0])
}

export async function confettiCompletion() {
  await fire({ particleCount: 90, spread: 65, origin: { y: 0.65 } })
}

export async function confettiCelebration() {
  await Promise.all([
    fire({ particleCount: 140, spread: 80, origin: { y: 0.55 } }),
    fire({ particleCount: 70, angle: 60,  spread: 55, origin: { x: 0, y: 0.6 } }),
    fire({ particleCount: 70, angle: 120, spread: 55, origin: { x: 1, y: 0.6 } }),
  ])
}

export async function confettiBadge() {
  await fire({
    particleCount: 110,
    spread: 75,
    colors: ['#FFD700', '#FFA500', '#FF8C00', '#FFEC3D'],
    origin: { y: 0.45 },
  })
}
