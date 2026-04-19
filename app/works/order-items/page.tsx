import dynamic from 'next/dynamic'

// 생산관리 — primary Works page, backed by WorksGrid (flat_order_details).
// Imported dynamically with SSR disabled because Handsontable touches
// window on init.
const WorksGrid = dynamic(() => import('@/components/works/WorksGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function ProductionPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <WorksGrid />
    </div>
  )
}
