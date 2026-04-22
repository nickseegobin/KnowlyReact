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

function taskTypeIcon(_type: string) {
  return '/icons/generic-icons.png'
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

  const trials = tasks.filter((t) => t.type === 'trial')
  const quests = tasks.filter((t) => t.type === 'quest')

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
                    <Image src={taskTypeIcon(task.type)} alt="Trial" width={40} height={40} className="object-contain w-full h-full" />
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
                  href={`/child/classes/${class_id}/trial/${task.id}?subject=${encodeURIComponent(task.subject ?? '')}&difficulty=${task.difficulty ?? 'easy'}&title=${encodeURIComponent(task.title)}&reward=${task.gem_reward ?? 0}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0">
                    <Image src={taskTypeIcon(task.type)} alt="Trial" width={40} height={40} className="object-contain w-full h-full" />
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
                  {task.gem_reward ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Image src="/icons/blue-gem.png" alt="Gem reward" width={16} height={16} />
                      <span className="text-xs font-semibold">+{task.gem_reward}</span>
                    </div>
                  ) : null}
                  <span className="text-base-content/30 text-lg">›</span>
                </Link>
              )
            )}
          </div>
        )}
      </section>

      {/* Quests section */}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-lg">Quests</h2>
        {quests.length === 0 ? (
          <p className="text-sm text-base-content/50 py-4 text-center">No quests assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {quests.map((task) =>
              task.completed ? (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 opacity-60 cursor-default"
                >
                  <div className="w-10 h-10 shrink-0">
                    <Image src={taskTypeIcon(task.type)} alt="Quest" width={40} height={40} className="object-contain w-full h-full" />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <p className="font-semibold text-sm line-through">{task.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {task.subject && <span className="text-xs text-base-content/60">{task.subject}</span>}
                    </div>
                  </div>
                  <span className="badge badge-success badge-sm gap-1 shrink-0">✓ Done</span>
                </div>
              ) : (
                <Link
                  key={task.id}
                  href={`/child/classes/${class_id}/quest/${task.id}?subject=${encodeURIComponent(task.subject ?? '')}&difficulty=${task.difficulty ?? 'easy'}&title=${encodeURIComponent(task.title)}&reward=${task.gem_reward ?? 0}&ref=${encodeURIComponent(task.reference_id ?? '')}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-base-200 hover:bg-base-300 transition-colors"
                >
                  <div className="w-10 h-10 shrink-0">
                    <Image src={taskTypeIcon(task.type)} alt="Quest" width={40} height={40} className="object-contain w-full h-full" />
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
                  {task.gem_reward ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Image src="/icons/blue-gem.png" alt="Gem reward" width={16} height={16} />
                      <span className="text-xs font-semibold">+{task.gem_reward}</span>
                    </div>
                  ) : null}
                  <span className="text-base-content/30 text-lg">›</span>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  )
}
