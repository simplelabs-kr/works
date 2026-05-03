import dynamic from 'next/dynamic'

const CuttingWheelGrid = dynamic(() => import('@/components/works/CuttingWheelGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function CuttingWheelPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CuttingWheelGrid />
    </div>
  )
}
