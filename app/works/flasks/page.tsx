import dynamic from 'next/dynamic'

const FlasksGrid = dynamic(() => import('@/components/works/FlasksGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function FlasksPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <FlasksGrid />
    </div>
  )
}
