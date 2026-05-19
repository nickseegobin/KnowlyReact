'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft, TrendingUp, ClipboardCheck, Compass, Award, AlertTriangle, Send } from 'lucide-react'
import { PERIODS } from '@/types/knowly'

const SUBJECTS = [
  { value: 'math',           label: 'Math'         },
  { value: 'english',        label: 'English'       },
  { value: 'science',        label: 'Science'       },
  { value: 'social_studies', label: 'Social Studies'},
]

interface TopicBreakdownItem {
  topic:           string
  subject:         string
  total_questions: number
  correct_rate:    number | null
  is_strength:     boolean
  is_weakness:     boolean
}

interface RecentTrial {
  subject:      string
  topic:        string | null
  difficulty:   string
  percentage:   number | null
  source:       string
  completed_at: string
}

interface StudentAnalytics {
  user_id:          number
  nickname:         string
  level:            string
  at_risk:          boolean
  trial_count:      number
  quest_count:      number
  badges_earned:    number
  avg_score:        number | null
  weekly_trials:    number
  topics_attempted: number
  strengths:        Array<{ topic: string; subject: string; correct_rate: number | null }>
  weaknesses:       Array<{ topic: string; subject: string; correct_rate: number | null }>
  topic_breakdown:  TopicBreakdownItem[]
  recent_trials:    RecentTrial[]
}

function score(val?: number | null) {
  if (val == null) return '—'
  return `${Math.round(val)}%`
}

function subjectLabel(s: string | null | undefined) {
  if (!s) return '—'
  return SUBJECTS.find((x) => x.value === s)?.label ?? s.replace(/_/g, ' ')
}

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('en-TT', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return iso }
}

function levelLabel(v: string) {
  return v === 'std_4' ? 'Standard 4' : v === 'std_5' ? 'Standard 5' : v
}

export default function StudentProfilePage() {
  const params  = useParams()
  const router  = useRouter()
  const classId = params.class_id as string
  const userId  = params.user_id  as string

  const [period,  setPeriod]  = useState('')
  const [subject, setSubject] = useState('')
  const [data,    setData]    = useState<StudentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  const [notifyMsg,     setNotifyMsg]     = useState('')
  const [notifySending, setNotifySending] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(false)
  const [notifyError,   setNotifyError]   = useState('')

  const [studentMsg,     setStudentMsg]     = useState('')
  const [studentSending, setStudentSending] = useState(false)
  const [studentSuccess, setStudentSuccess] = useState(false)
  const [studentError,   setStudentError]   = useState('')

  const fetchAnalytics = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const qs  = new URLSearchParams()
      if (period)  qs.set('period',  period)
      if (subject) qs.set('subject', subject)
      const res  = await fetch(`/api/analytics/class/${classId}/student/${userId}${qs.toString() ? `?${qs}` : ''}`)
      const json = await res.json()
      if (!res.ok) setError(json.message ?? 'Failed to load.')
      else         setData(json)
    } catch { setError('Something went wrong.') }
    finally  { setLoading(false) }
  }, [classId, userId, period, subject])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  async function sendNotification() {
    if (!notifyMsg.trim()) return
    setNotifySending(true); setNotifyError(''); setNotifySuccess(false)
    try {
      const res = await fetch(`/api/classes/${classId}/notify-parent/${userId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: notifyMsg.trim() }),
      })
      if (res.ok) { setNotifySuccess(true); setNotifyMsg('') }
      else        { const j = await res.json(); setNotifyError(j.message ?? 'Failed to send.') }
    } catch { setNotifyError('Something went wrong.') }
    finally { setNotifySending(false) }
  }

  async function sendStudentNotification() {
    if (!studentMsg.trim()) return
    setStudentSending(true); setStudentError(''); setStudentSuccess(false)
    try {
      const res = await fetch(`/api/classes/${classId}/notify-student/${userId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: studentMsg.trim() }),
      })
      if (res.ok) { setStudentSuccess(true); setStudentMsg('') }
      else        { const j = await res.json(); setStudentError(j.message ?? 'Failed to send.') }
    } catch { setStudentError('Something went wrong.') }
    finally { setStudentSending(false) }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => router.push(`/teacher/analytics/${classId}`)}
          className="btn btn-circle btn-sm btn-ghost border border-base-300 shrink-0 mt-1"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="h-8 w-40 bg-base-200 rounded animate-pulse" />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold">{data?.nickname ?? 'Student'}</h1>
                {data?.at_risk && (
                  <span className="badge badge-error badge-sm gap-1">
                    <AlertTriangle size={10} /> At Risk
                  </span>
                )}
              </div>
              <p className="text-sm text-base-content/50 mt-0.5">
                {data?.level ? levelLabel(data.level) : ''} · Student Report
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-2 flex-wrap">
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="select select-bordered select-sm">
          <option value="">All Terms</option>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="select select-bordered select-sm">
          <option value="">All Subjects</option>
          {SUBJECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading && <div className="flex justify-center py-10"><span className="loading loading-spinner loading-md" /></div>}
      {error   && <div className="bg-base-200 rounded-2xl p-6 text-center text-sm text-error">{error}</div>}

      {!loading && !error && data && (
        <>
          {/* ── Stats bar ── */}
          <div className="flex gap-0 text-center rounded-2xl bg-base-200 overflow-hidden">
            <div className="flex-1 py-4">
              <p className={`text-2xl font-bold ${data.at_risk ? 'text-error' : 'text-success'}`}>{score(data.avg_score)}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Avg Score</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold">{data.trial_count}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Trials</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold">{data.quest_count}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Quests</p>
            </div>
            <div className="w-px bg-base-300" />
            <div className="flex-1 py-4">
              <p className="text-2xl font-bold text-warning">{data.badges_earned}</p>
              <p className="text-xs text-base-content/50 mt-0.5">Badges</p>
            </div>
          </div>

          {/* ── Activity chips ── */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-base-200 rounded-full px-3 py-1.5 text-xs font-medium">
              <ClipboardCheck size={13} className="text-warning" />
              {data.weekly_trials} trial{data.weekly_trials !== 1 ? 's' : ''} this week
            </div>
            <div className="flex items-center gap-1.5 bg-base-200 rounded-full px-3 py-1.5 text-xs font-medium">
              <Compass size={13} className="text-success" />
              {data.topics_attempted} topic{data.topics_attempted !== 1 ? 's' : ''} attempted
            </div>
            {data.badges_earned > 0 && (
              <div className="flex items-center gap-1.5 bg-base-200 rounded-full px-3 py-1.5 text-xs font-medium">
                <Award size={13} className="text-warning" />
                {data.badges_earned} badge{data.badges_earned !== 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* ── Strengths / Weaknesses ── */}
          {(data.strengths.length > 0 || data.weaknesses.length > 0) && (
            <>
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base">Topic Breakdown</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {data.strengths.length > 0 && (
                  <div className="bg-success/8 border border-success/20 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-success mb-2">Strengths</p>
                    {data.strengths.map((s, i) => (
                      <div key={i} className="flex items-center justify-between mb-1">
                        <p className="text-xs text-base-content/70 truncate">{s.topic}</p>
                        <p className="text-xs font-semibold text-success ml-1 shrink-0">{score(s.correct_rate)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {data.weaknesses.length > 0 && (
                  <div className="bg-error/8 border border-error/20 rounded-2xl p-4">
                    <p className="text-sm font-semibold text-error mb-2">Needs Work</p>
                    {data.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-center justify-between mb-1">
                        <p className="text-xs text-base-content/70 truncate">{w.topic}</p>
                        <p className="text-xs font-semibold text-error ml-1 shrink-0">{score(w.correct_rate)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── All topics with progress bars ── */}
          {data.topic_breakdown.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <p className="font-semibold text-base">All Topics</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="flex flex-col gap-2">
                {data.topic_breakdown.map((t, i) => (
                  <div key={i} className="bg-base-200 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{t.topic}</p>
                        <p className="text-xs text-base-content/50">{subjectLabel(t.subject)} · {t.total_questions} question{t.total_questions !== 1 ? 's' : ''}</p>
                      </div>
                      <p className={`text-sm font-bold ml-3 shrink-0 ${t.is_strength ? 'text-success' : t.is_weakness ? 'text-error' : ''}`}>
                        {score(t.correct_rate)}
                      </p>
                    </div>
                    <div className="w-full bg-base-300 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${t.is_strength ? 'bg-success' : t.is_weakness ? 'bg-error' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, Math.round(t.correct_rate ?? 0))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Recent trials ── */}
          {data.recent_trials.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <TrendingUp size={15} className="text-base-content/50" />
                <p className="font-semibold text-base">Recent Trials</p>
                <div className="flex-1 h-px bg-base-200" />
              </div>
              <div className="flex flex-col gap-2">
                {data.recent_trials.map((t, i) => (
                  <div key={i} className="bg-base-200 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {subjectLabel(t.subject)}{t.topic ? ` · ${t.topic}` : ''}
                      </p>
                      <p className="text-xs text-base-content/50 capitalize">{t.difficulty} · {formatDate(t.completed_at)}</p>
                    </div>
                    <p className={`text-sm font-bold ml-3 shrink-0 ${
                      (t.percentage ?? 0) >= 70 ? 'text-success' : (t.percentage ?? 0) >= 50 ? 'text-warning' : 'text-error'
                    }`}>
                      {score(t.percentage)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Notifications ── */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <p className="font-semibold text-base">Send Notification</p>
              <div className="flex-1 h-px bg-base-200" />
            </div>

            {/* Notify Student */}
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">Notify Student</p>
              <p className="text-xs text-base-content/50">
                Send a message directly to {data.nickname}. It will appear in their Knowly notifications.
              </p>
              <textarea
                value={studentMsg}
                onChange={(e) => setStudentMsg(e.target.value)}
                placeholder={`e.g. Great effort this week, ${data.nickname}! Keep practising fractions.`}
                rows={3}
                className="textarea textarea-bordered textarea-sm w-full resize-none"
              />
              {studentError   && <p className="text-xs text-error">{studentError}</p>}
              {studentSuccess && <p className="text-xs text-success">Message sent to {data.nickname}.</p>}
              <button
                onClick={sendStudentNotification}
                disabled={studentSending || !studentMsg.trim()}
                className="btn btn-sm btn-primary self-end gap-1.5"
              >
                {studentSending
                  ? <span className="loading loading-spinner loading-xs" />
                  : <><Send size={13} /> Send to Student</>}
              </button>
            </div>

            {/* Notify Parent */}
            <div className="bg-base-200 rounded-2xl p-4 flex flex-col gap-3">
              <p className="text-sm font-semibold">Notify Parent</p>
              <p className="text-xs text-base-content/50">
                Send a message to {data.nickname}'s parent. It will appear in their Knowly notifications.
              </p>
              <textarea
                value={notifyMsg}
                onChange={(e) => setNotifyMsg(e.target.value)}
                placeholder={`e.g. ${data.nickname} is falling behind in Mathematics — please encourage more practice at home.`}
                rows={3}
                className="textarea textarea-bordered textarea-sm w-full resize-none"
              />
              {notifyError   && <p className="text-xs text-error">{notifyError}</p>}
              {notifySuccess && <p className="text-xs text-success">Message sent to parent.</p>}
              <button
                onClick={sendNotification}
                disabled={notifySending || !notifyMsg.trim()}
                className="btn btn-sm btn-neutral self-end gap-1.5"
              >
                {notifySending
                  ? <span className="loading loading-spinner loading-xs" />
                  : <><Send size={13} /> Send to Parent</>}
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
