import dynamic from 'next/dynamic'

const PurchasesGrid = dynamic(() => import('@/components/works/PurchasesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function PurchasesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <PurchasesGrid />
    </div>
  )
}
