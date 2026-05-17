/**
 * Shared subject-catalogue utilities.
 *
 * All three study pages (Quests, Lessons, Trials) need to resolve the same
 * question: which subjects actually have content available for this child?
 * This module centralises the answer so each page uses one consistent source.
 */

// ── Constants ──────────────────────────────────────────────────────────────────

/** Canonical display order — used to sort whatever the API returns. */
export const SUBJECT_ORDER = ['math', 'english', 'science', 'social_studies'] as const
export type SubjectCode = (typeof SUBJECT_ORDER)[number]

/** Internal code → full display name (matches WP API / [subject] route segments). */
export const SUBJECT_DISPLAY: Record<string, string> = {
  math:           'Mathematics',
  english:        'English Language Arts',
  science:        'Science',
  social_studies: 'Social Studies',
}

/** WP display name → internal code. */
export const DISPLAY_TO_CODE: Record<string, string> = {
  'Mathematics':           'math',
  'English Language Arts': 'english',
  'Science':               'science',
  'Social Studies':        'social_studies',
}

/** Short label used in tab buttons. */
export const SUBJECT_SHORT: Record<string, string> = {
  math:           'Maths',
  english:        'English',
  science:        'Science',
  social_studies: 'Social Studies',
}

// ── Filtering utilities ────────────────────────────────────────────────────────

interface CatalogueEntry { subject: string; pool_count: number }

/**
 * Derive available subjects from a Trials catalogue.
 * Only includes subjects where at least one difficulty slot has pool_count > 0.
 * The catalogue entries use WP display names ("Mathematics"); this maps them
 * back to internal codes ("math") and returns them in SUBJECT_ORDER order.
 */
export function subjectsFromCatalogue(catalogue: CatalogueEntry[]): SubjectCode[] {
  const withQuestions = new Set(
    catalogue
      .filter((e) => e.pool_count > 0)
      .map((e) => DISPLAY_TO_CODE[e.subject])
      .filter(Boolean)
  )
  return SUBJECT_ORDER.filter((s) => withQuestions.has(s))
}

interface LessonEntry { subject: string }

/**
 * Derive available subjects from a Lessons list.
 * Lessons entries already use internal codes ("math").
 * Only codes present in SUBJECT_ORDER are included (guards against future
 * subjects the client doesn't recognise yet).
 */
export function subjectsFromLessons(lessons: LessonEntry[]): SubjectCode[] {
  const found = new Set(lessons.map((l) => l.subject))
  return SUBJECT_ORDER.filter((s) => found.has(s))
}

interface SubjectProgression { topics_total: number }

/**
 * Derive available subjects from a Quests progression map.
 * A subject must exist in the map AND have topics_total > 0 — an entry with
 * zero topics means the curriculum content hasn't been seeded yet.
 */
export function subjectsFromProgression(
  subjects: Record<string, SubjectProgression>
): SubjectCode[] {
  return SUBJECT_ORDER.filter((s) => subjects[s] && subjects[s].topics_total > 0)
}
