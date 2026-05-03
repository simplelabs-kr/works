import dynamic from 'next/dynamic'

const MoldsGrid = dynamic(() => import('@/components/works/MoldsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function MoldsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <MoldsGrid />
    </div>
  )
}
