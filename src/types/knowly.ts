// ── User & Auth ───────────────────────────────────────────────────────────────

export type KnowlyRole = 'parent' | 'teacher' | 'child' | 'admin'

export interface AuthUser {
  user_id: number
  display_name: string
  first_name: string
  last_name: string
  email: string
  role: KnowlyRole
  avatar_index: number | null
  /** Parent blue gem balance */
  gem_balance?: number
  /** Parent only — children linked to this account */
  children?: ChildProfile[]
  /** Teacher only — pending_approval | approved | suspended */
  approval_status?: string
  /** Parent only — active child being switched to */
  active_child_id?: number | null
}

export interface TeacherProfile {
  user_id: number
  display_name: string
  first_name: string
  last_name: string
  email: string
  role: 'teacher'
  avatar_index: number
  approval_status: string
  school_name: string
  class_name: string
  phone: string
  red_gem_balance: number
  red_gem_stipend: number
}

export interface ClassEntry {
  id: number
  name: string
  description?: string
  level?: string
  member_count?: number
  teacher_name?: string
}

export interface LoginResponse {
  token: string
  expires_in: number
  user_id: number
  display_name: string
  role: KnowlyRole
  active_child_id: number | null
}

// ── Child ─────────────────────────────────────────────────────────────────────

export interface ChildProfile {
  child_id: number
  display_name: string
  first_name: string
  last_name: string
  /** Caribbean leaderboard alias — also the WP user_login */
  nickname: string
  /** e.g. std_4 | std_5 */
  level: string
  /** e.g. term_1 | term_2 | term_3 | '' (capstone) */
  period: string
  age: number | null
  /** 1–10 — maps to /avatars/children/avatar-{n}.png */
  avatar_index: number
  created_at: string
}

export interface CreateChildPayload {
  first_name: string
  last_name?: string
  nickname: string
  level: string
  period?: string
  age?: number
  avatar_index?: number
}

// ── Registration ──────────────────────────────────────────────────────────────

export interface RegisterParentPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  phone?: string
  avatar_index?: number
}

export interface RegisterTeacherPayload {
  first_name: string
  last_name: string
  email: string
  password: string
  school_name: string
  class_name?: string
  phone?: string
  principal_name?: string
  principal_contact?: string
}

// ── PIN ───────────────────────────────────────────────────────────────────────

export interface PinStatus {
  pin_set: boolean
}

// ── API error shape from WP ───────────────────────────────────────────────────

export interface WPError {
  code: string
  message: string
  data?: { status: number; [key: string]: unknown }
}

// ── Curriculum constants ──────────────────────────────────────────────────────

export const LEVELS = [
  { value: 'std_4', label: 'Standard 4' },
  { value: 'std_5', label: 'Standard 5 (Capstone)' },
] as const

export const PERIODS = [
  { value: 'term_1', label: 'Term 1' },
  { value: 'term_2', label: 'Term 2' },
  { value: 'term_3', label: 'Term 3' },
] as const

export type Level = (typeof LEVELS)[number]['value']
export type Period = (typeof PERIODS)[number]['value']
