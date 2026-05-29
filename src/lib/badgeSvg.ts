/**
 * Badge SVG rendering with period-based color injection.
 *
 * SVG templates use CSS custom properties --badge-primary and --badge-secondary.
 * This module injects a <style> block with the correct values for each period,
 * so the same SVG renders in different colors per term.
 */

export interface PeriodColors {
  primary:   string
  secondary: string
}

export const PERIOD_COLORS: Record<string, PeriodColors> = {
  term_1:     { primary: '#2271b1', secondary: '#90caf9' },
  term_2:     { primary: '#00641b', secondary: '#81c784' },
  term_3:     { primary: '#e65c00', secondary: '#ffcc80' },
  semester_1: { primary: '#5c1a8c', secondary: '#ce93d8' },
  semester_2: { primary: '#b71c1c', secondary: '#ef9a9a' },
  capstone:   { primary: '#1a237e', secondary: '#7986cb' },
}

const FALLBACK_COLORS: PeriodColors = { primary: '#607d8b', secondary: '#b0bec5' }

export function getPeriodColors(period: string | null | undefined): PeriodColors {
  return PERIOD_COLORS[period ?? ''] ?? FALLBACK_COLORS
}

/**
 * Inject period colors into an SVG string by prepending a <style> block.
 * Returns the modified SVG ready for dangerouslySetInnerHTML.
 */
export function injectPeriodColors(svg: string, period: string | null | undefined): string {
  if (!svg) return DEFAULT_BADGE_SVG
  const { primary, secondary } = getPeriodColors(period)
  const styleBlock = `<style>svg{--badge-primary:${primary};--badge-secondary:${secondary}}</style>`
  return svg.replace(/<svg([^>]*)>/, `<svg$1>${styleBlock}`)
}

/**
 * Default badge SVG — a simple medal shape used when no subject SVG is configured.
 * Uses --badge-primary and --badge-secondary so period colors still apply.
 */
export const DEFAULT_BADGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="56" r="36" fill="var(--badge-primary,#2271b1)" opacity="0.15"/>
  <circle cx="50" cy="56" r="30" fill="var(--badge-primary,#2271b1)"/>
  <circle cx="50" cy="56" r="24" fill="none" stroke="var(--badge-secondary,#90caf9)" stroke-width="2"/>
  <polygon points="50,38 53.5,48 64,48 55.5,54 58.5,64 50,58 41.5,64 44.5,54 36,48 46.5,48" fill="var(--badge-secondary,#90caf9)"/>
  <rect x="44" y="14" width="12" height="16" rx="2" fill="var(--badge-primary,#2271b1)"/>
  <rect x="38" y="12" width="24" height="6" rx="3" fill="var(--badge-secondary,#90caf9)"/>
</svg>`
