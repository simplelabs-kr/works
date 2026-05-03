import dynamic from 'next/dynamic'

const MaterialsGrid = dynamic(() => import('@/components/works/MaterialsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function MaterialsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MaterialsGrid />
    </div>
  )
}
