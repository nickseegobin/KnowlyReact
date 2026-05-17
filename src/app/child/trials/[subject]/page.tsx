import { redirect } from 'next/navigation'

const DISPLAY_TO_CODE: Record<string, string> = {
  'Mathematics':           'math',
  'English Language Arts': 'english',
  'Science':               'science',
  'Social Studies':        'social_studies',
}

// This route is superseded by /child/trials?subject=<code>.
// Redirect any direct hits so old links still resolve correctly.
export default async function TrialSubjectRedirect({
  params,
}: {
  params: Promise<{ subject: string }>
}) {
  const { subject: encodedSubject } = await params
  const subject = decodeURIComponent(encodedSubject)
  const code = DISPLAY_TO_CODE[subject] ?? 'math'
  redirect(`/child/trials?subject=${code}`)
}
