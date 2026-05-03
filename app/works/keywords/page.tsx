import dynamic from 'next/dynamic'

const KeywordsGrid = dynamic(() => import('@/components/works/KeywordsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function KeywordsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <KeywordsGrid />
    </div>
  )
}
