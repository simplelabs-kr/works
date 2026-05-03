import dynamic from 'next/dynamic'

const CuttingFieldGrid = dynamic(() => import('@/components/works/CuttingFieldGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function CuttingFieldPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CuttingFieldGrid />
    </div>
  )
}
