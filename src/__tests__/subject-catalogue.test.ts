/**
 * Tests for src/lib/subject-catalogue.ts
 *
 * Three utility functions that derive which subjects have real content:
 *   subjectsFromCatalogue  — Trials: pool_count > 0 required
 *   subjectsFromLessons    — Lessons: any lesson entry for that subject
 *   subjectsFromProgression — Quests: topics_total > 0 required
 */

import {
  SUBJECT_ORDER,
  subjectsFromCatalogue,
  subjectsFromLessons,
  subjectsFromProgression,
} from '@/lib/subject-catalogue'

// ── subjectsFromCatalogue ─────────────────────────────────────────────────────

describe('subjectsFromCatalogue', () => {
  it('returns only subjects where at least one difficulty has pool_count > 0', () => {
    const catalogue = [
      { subject: 'Mathematics',           difficulty: 'easy',   pool_count: 10 },
      { subject: 'Mathematics',           difficulty: 'medium', pool_count: 0  },
      { subject: 'English Language Arts', difficulty: 'easy',   pool_count: 0  },
      { subject: 'English Language Arts', difficulty: 'medium', pool_count: 0  },
      { subject: 'Science',               difficulty: 'easy',   pool_count: 5  },
    ]
    const result = subjectsFromCatalogue(catalogue)
    expect(result).toEqual(['math', 'science'])
  })

  it('excludes a subject where all difficulties have pool_count = 0', () => {
    const catalogue = [
      { subject: 'Social Studies', difficulty: 'easy',   pool_count: 0 },
      { subject: 'Social Studies', difficulty: 'medium', pool_count: 0 },
      { subject: 'Social Studies', difficulty: 'hard',   pool_count: 0 },
    ]
    expect(subjectsFromCatalogue(catalogue)).toEqual([])
  })

  it('returns subjects in SUBJECT_ORDER regardless of catalogue order', () => {
    const catalogue = [
      { subject: 'Science',               difficulty: 'easy', pool_count: 3 },
      { subject: 'Mathematics',           difficulty: 'easy', pool_count: 7 },
      { subject: 'English Language Arts', difficulty: 'hard', pool_count: 2 },
    ]
    const result = subjectsFromCatalogue(catalogue)
    expect(result).toEqual(['math', 'english', 'science'])
    expect(result).toEqual([...result].sort((a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b)))
  })

  it('ignores entries with unknown display names', () => {
    const catalogue = [
      { subject: 'Philosophy', difficulty: 'easy', pool_count: 99 },
      { subject: 'Mathematics', difficulty: 'easy', pool_count: 5  },
    ]
    expect(subjectsFromCatalogue(catalogue)).toEqual(['math'])
  })

  it('returns empty array for empty catalogue', () => {
    expect(subjectsFromCatalogue([])).toEqual([])
  })

  it('handles all four subjects with content', () => {
    const catalogue = [
      { subject: 'Mathematics',           difficulty: 'easy', pool_count: 5 },
      { subject: 'English Language Arts', difficulty: 'easy', pool_count: 5 },
      { subject: 'Science',               difficulty: 'easy', pool_count: 5 },
      { subject: 'Social Studies',        difficulty: 'easy', pool_count: 5 },
    ]
    expect(subjectsFromCatalogue(catalogue)).toEqual(['math', 'english', 'science', 'social_studies'])
  })
})

// ── subjectsFromLessons ───────────────────────────────────────────────────────

describe('subjectsFromLessons', () => {
  it('returns subjects for which at least one lesson exists', () => {
    const lessons = [
      { subject: 'math' },
      { subject: 'math' },
      { subject: 'science' },
    ]
    expect(subjectsFromLessons(lessons)).toEqual(['math', 'science'])
  })

  it('excludes subjects not in SUBJECT_ORDER', () => {
    const lessons = [
      { subject: 'philosophy' },
      { subject: 'english' },
    ]
    expect(subjectsFromLessons(lessons)).toEqual(['english'])
  })

  it('returns subjects in SUBJECT_ORDER regardless of lesson order', () => {
    const lessons = [
      { subject: 'social_studies' },
      { subject: 'math' },
      { subject: 'english' },
    ]
    expect(subjectsFromLessons(lessons)).toEqual(['math', 'english', 'social_studies'])
  })

  it('deduplicates subjects', () => {
    const lessons = [
      { subject: 'math' },
      { subject: 'math' },
      { subject: 'math' },
    ]
    expect(subjectsFromLessons(lessons)).toEqual(['math'])
  })

  it('returns empty array when lessons list is empty', () => {
    expect(subjectsFromLessons([])).toEqual([])
  })
})

// ── subjectsFromProgression ───────────────────────────────────────────────────

describe('subjectsFromProgression', () => {
  it('includes subjects present in map with topics_total > 0', () => {
    const subjects = {
      math:    { topics_total: 12 },
      english: { topics_total: 8  },
      science: { topics_total: 0  },
    }
    expect(subjectsFromProgression(subjects)).toEqual(['math', 'english'])
  })

  it('excludes subjects with topics_total = 0 (curriculum not seeded)', () => {
    const subjects = {
      math:           { topics_total: 0 },
      social_studies: { topics_total: 0 },
    }
    expect(subjectsFromProgression(subjects)).toEqual([])
  })

  it('excludes subjects not in the map at all', () => {
    const subjects = {
      math: { topics_total: 5 },
    }
    expect(subjectsFromProgression(subjects)).toEqual(['math'])
  })

  it('returns subjects in SUBJECT_ORDER', () => {
    const subjects = {
      social_studies: { topics_total: 3 },
      math:           { topics_total: 10 },
      science:        { topics_total: 7  },
    }
    expect(subjectsFromProgression(subjects)).toEqual(['math', 'science', 'social_studies'])
  })

  it('returns all four subjects when all have topics_total > 0', () => {
    const subjects = {
      math:           { topics_total: 10 },
      english:        { topics_total: 8  },
      science:        { topics_total: 6  },
      social_studies: { topics_total: 4  },
    }
    expect(subjectsFromProgression(subjects)).toEqual(['math', 'english', 'science', 'social_studies'])
  })

  it('returns empty array for empty subjects map', () => {
    expect(subjectsFromProgression({})).toEqual([])
  })
})
