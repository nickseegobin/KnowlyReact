import Link from 'next/link'

interface Crumb { label: string; href?: string }

export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div className="text-xs text-base-content/50 flex items-center gap-1 flex-wrap">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>›</span>}
          {c.href ? (
            <Link href={c.href} className="hover:text-base-content transition-colors">{c.label}</Link>
          ) : (
            <span className="font-semibold text-base-content">{c.label}</span>
          )}
        </span>
      ))}
    </div>
  )
}
