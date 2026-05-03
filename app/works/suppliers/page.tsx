import dynamic from 'next/dynamic'

const SuppliersGrid = dynamic(() => import('@/components/works/SuppliersGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function SuppliersPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <SuppliersGrid />
    </div>
  )
}
