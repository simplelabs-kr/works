import dynamic from 'next/dynamic'

const StonesGrid = dynamic(() => import('@/components/works/StonesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function StonesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <StonesGrid />
    </div>
  )
}
