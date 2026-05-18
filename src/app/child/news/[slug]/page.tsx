import NewsPost from '@/components/news/NewsPost'

export default async function ChildNewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <NewsPost slug={slug} basePath="/child/news" />
}
