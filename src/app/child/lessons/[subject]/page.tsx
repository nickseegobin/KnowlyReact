import { redirect } from 'next/navigation'

const SUBJECT_SLUG: Record<string, string> = {
  'Mathematics':           'math',
  'English Language Arts': 'english',
  'Language Arts':         'english',
  'Science':               'science',
  'Social Studies':        'social_studies',
}

export default async function LessonsSubjectRedirect({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)
  const slug    = SUBJECT_SLUG[subject] ?? subject.toLowerCase().replace(/\s+/g, '_')
  redirect(`/child/lessons?subject=${slug}`)
}
