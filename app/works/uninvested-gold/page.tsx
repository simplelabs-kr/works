import dynamic from 'next/dynamic'

const UninvestedGoldGrid = dynamic(() => import('@/components/works/UninvestedGoldGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function UninvestedGoldPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <UninvestedGoldGrid />
    </div>
  )
}
