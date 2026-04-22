import dynamic from 'next/dynamic'

// 번들 — Bundles page (Case B 직접 JOIN). Handsontable 이 window 를
// 참조하므로 SSR 비활성화.
const BundlesGrid = dynamic(() => import('@/components/works/BundlesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function BundlesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <BundlesGrid />
    </div>
  )
}
