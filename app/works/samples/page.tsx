import dynamic from 'next/dynamic'

const SamplesGrid = dynamic(() => import('@/components/works/SamplesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function SamplesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SamplesGrid />
    </div>
  )
}
