import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import QuickNav from '@/components/nav/QuickNav'
import GuideComplete from './GuideComplete'

// The Getting Started page renders from content/getting-started.md — edit that
// file to update the page. See docs/ARCHITECTURE.md (it's the canonical
// user-facing "how it works" doc).

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function toText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(toText).join('')
  if (children && typeof children === 'object' && 'props' in (children as { props?: { children?: React.ReactNode } })) {
    return toText((children as { props: { children?: React.ReactNode } }).props.children)
  }
  return ''
}

export default async function GuidePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, guide_completed')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
  const guideComplete = profile?.guide_completed ?? false
  // Until Getting Started is acknowledged, every later phase is locked.
  const lockedPaths = !isAdmin && !guideComplete
    ? ['/onboarding/phase1', '/onboarding/phase2', '/onboarding/sops']
    : []

  const raw = fs.readFileSync(path.join(process.cwd(), 'content/getting-started.md'), 'utf8')
  const { data: fm, content } = matter(raw)
  const title = (fm.title as string) ?? 'Getting Started'
  const subtitle = (fm.subtitle as string) ?? ''

  // Sidebar table of contents, built from the ## / ### headings.
  const toc = content
    .split('\n')
    .map(line => {
      const m = /^(#{2,3})\s+(.*)$/.exec(line.trim())
      if (!m) return null
      const text = m[2].trim()
      return { level: m[1].length, text, id: slugify(text) }
    })
    .filter(Boolean) as { level: number; text: string; id: string }[]

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const mdComponents = {
    h2: ({ children }: any) => <h2 id={slugify(toText(children))} className="text-2xl font-bold mt-10 mb-3 scroll-mt-20">{children}</h2>,
    h3: ({ children }: any) => <h3 id={slugify(toText(children))} className="text-lg font-semibold mt-6 mb-2 scroll-mt-20">{children}</h3>,
    p: ({ children }: any) => <p className="text-sm text-gray-300 leading-relaxed mb-3">{children}</p>,
    ul: ({ children }: any) => <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300 mb-4">{children}</ul>,
    ol: ({ children }: any) => <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-300 mb-4">{children}</ol>,
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    a: ({ children, href }: any) => <a href={href} className="text-blue-400 hover:text-blue-300 underline">{children}</a>,
    strong: ({ children }: any) => <strong className="text-white font-semibold">{children}</strong>,
    blockquote: ({ children }: any) => <blockquote className="border-l-2 border-green-700/60 bg-green-900/15 rounded-r-lg px-4 py-2 my-4 text-sm text-gray-300">{children}</blockquote>,
    code: ({ children }: any) => <code className="bg-gray-800 text-gray-200 px-1.5 py-0.5 rounded text-xs">{children}</code>,
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <QuickNav isAdmin={isAdmin} lockedPaths={lockedPaths} />

      <div className="max-w-6xl mx-auto px-4 py-8 flex gap-8">
        {/* Sticky TOC */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-8">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-3">Contents</p>
            <nav className="space-y-0.5">
              {toc.map(s => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block text-sm py-1 transition-colors hover:text-white ${s.level === 3 ? 'pl-3 text-gray-500 hover:text-gray-300' : 'text-gray-300 font-medium'}`}
                >
                  {s.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 max-w-3xl pb-24">
          <div className="inline-block bg-green-600/20 border border-green-600/30 text-green-300 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            Phase 0 · Getting Started
          </div>
          <h1 className="text-3xl font-bold mb-1">{title}</h1>
          {subtitle && <p className="text-gray-400 mb-6">{subtitle}</p>}

          {/* Intro video */}
          <div className="mb-8" style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src="https://www.loom.com/embed/9fb584dd8d5e4b6c8dc01e1b1cc462f3"
              frameBorder={0}
              allowFullScreen
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '0.75rem' }}
            />
          </div>

          <GuideComplete alreadyComplete={guideComplete} isAdmin={isAdmin} variant="top" />

          <article>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
              {content}
            </ReactMarkdown>
          </article>
        </main>
      </div>

      <GuideComplete alreadyComplete={guideComplete} isAdmin={isAdmin} variant="bottom" />
    </div>
  )
}
