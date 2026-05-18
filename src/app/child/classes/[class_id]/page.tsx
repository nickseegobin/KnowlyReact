import { redirect } from 'next/navigation'
import { getTokenFromCookie } from '@/lib/cookies'
import { wpFetch } from '@/lib/wp-api'
import Breadcrumb from '@/components/child/Breadcrumb'
import Image from 'next/image'
import Link from 'next/link'

interface Task {
  id: number
  title: string
  description?: string
  subject?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  type: string
  reference_id?: string
  lesson_section_index?: number | null
  due_date?: string
  gem_reward?: number
  status: string
  completed: boolean
}

interface ClassInfo {
  id: number
  name: string
  level?: string
  teacher_name?: string
  school_name?: string
}

interface ClassTasksResponse {
  class: ClassInfo
  tasks: Task[]
  count: number
}

function difficultyLabel(d?: string) {
  if (!d) return null
  return d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : d === 'hard' ? 'Hard' : d
}

function levelLabel(level?: string) {
  if (!level) return ''
  return level === 'std_4' ? 'Standard 4' : level === 'std_5' ? 'Standard 5' : level
}


export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ class_id: string }>
}) {
  const { class_id } = await params
  const token = await getTokenFromCookie()
  if (!token) redirect('/login')

  let info: ClassInfo | null = null
  let tasks: Task[] = []
  let error = ''

  try {
    const data = await wpFetch<ClassTasksResponse>(`/classes/${class_id}/my-tasks`, 'GET', undefined, token)
    info = data.class
    tasks = data.tasks ?? []
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 403) {
      redirect('/child/classes')
    }
    error = 'Could not load class details.'
  }

  const trials  = tasks.filter((t) => t.type === 'trial')
  const lessons = tasks.filter((t) => t.type === 'lesson' || t.type === 'quest')

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="flex items-center gap-3">
        <Link href="/child/classes" className="btn btn-circle btn-sm btn-ghost border border-base-300">‹</Link>
        <Breadcrumb crumbs={[
          { label: 'Home', href: '/child/home' },
          { label: 'Classes', href: '/child/classes' },
          { label: info?.name ?? 'Class' },
        ]} />
      </div>

      {/* Class header */}
      <div className="flex items-start gap-4 p-4 rounded-2xl bg-base-200">
        <div className="w-14 h-14 shrink-0">
          <Image src="/icons/generic-icons.png" alt={info?.name ?? 'Class'} width={56} height={56} className="object-contain w-full h-full" />
        </div>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-bold">{info?.name ?? 'Class'}</h1>
          {info?.teacher_name && <p className="text-sm text-base-content/60">{info.teacher_name}</p>}
          {info?.school_name && <p className="text-xs text-base-content/50">{info.school_name}</p>}
          {info?.level && <p className="text-xs font-semibold mt-0.5">{levelLabel(info.level)}</p>}
        </div>
      </div>

      {error && (
        <div className="alert alert-error text-sm"><span>{error}</span></div>
      )}

      {/* Trials section */}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-lg">Trials</h2>
        {trials.length === 0 ? (
          <p className="text-sm text-base-content/50 py-4 text-center">No trials assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {trials.map((task) =>
              task.completed ? (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 opacity-60 cursor-default"
                >
                  <div className="w-10 h-10 shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/generic-icons.png" alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="font-semibold text-sm line-through">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.subject && <span className="text-xs text-base-content/60">{task.subject}</span>}
                      {task.difficulty && (
                        <span className="badge badge-sm badge-outline">{difficultyLabel(task.difficulty)}</span>
                      )}
                    </div>
                  </div>
                  <span className="badge badge-success badge-sm gap-1 shrink-0">✓ Done</span>
                </div>
              ) : (
                <Link
                  key={task.id}
                  href={`/child/classes/${class_id}/trial/${task.id}?subject=${encodeURIComponent(task.subject ?? '')}&difficulty=${task.difficulty ?? 'easy'}&title=${encodeURIComponent(task.title)}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/generic-icons.png" alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.subject && <span className="text-xs text-base-content/60">{task.subject}</span>}
                      {task.difficulty && (
                        <span className="badge badge-sm badge-outline">{difficultyLabel(task.difficulty)}</span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-base-content/40">Due {task.due_date}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-base-content/30 text-lg">›</span>
                </Link>
              )
            )}
          </div>
        )}
      </section>

      {/* Lessons section */}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-lg">Lessons</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-base-content/50 py-4 text-center">No lessons assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {lessons.map((task) => {
              const lessonHref = (() => {
                let h = `/child/classes/${class_id}/lesson/${task.id}?ref=${encodeURIComponent(task.reference_id ?? '')}&title=${encodeURIComponent(task.title)}&subject=${encodeURIComponent(task.subject ?? '')}`
                if (task.lesson_section_index != null) h += `&section=${task.lesson_section_index}`
                return h
              })()
              const href = task.type === 'lesson'
                ? lessonHref
                : `/child/classes/${class_id}/quest/${task.id}?subject=${encodeURIComponent(task.subject ?? '')}&difficulty=${task.difficulty ?? 'easy'}&title=${encodeURIComponent(task.title)}&reward=${task.gem_reward ?? 0}&ref=${encodeURIComponent(task.reference_id ?? '')}`
              return task.completed ? (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 opacity-60 cursor-default"
                >
                  <div className="w-10 h-10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/generic-icons.png" alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="font-semibold text-sm line-through">{task.title}</p>
                    {task.subject && <span className="text-xs text-base-content/60">{task.subject}</span>}
                  </div>
                  <span className="badge badge-success badge-sm gap-1 shrink-0">✓ Done</span>
                </div>
              ) : (
                <Link
                  key={task.id}
                  href={href}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/generic-icons.png" alt="" className="w-10 h-10 object-contain" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="font-semibold text-sm">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.subject && <span className="text-xs text-base-content/60">{task.subject}</span>}
                      {task.due_date && (
                        <span className="text-xs text-base-content/40">Due {task.due_date}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-base-content/30 text-lg">›</span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
