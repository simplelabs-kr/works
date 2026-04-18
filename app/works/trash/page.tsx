import dynamic from 'next/dynamic'

// 휴지통 — soft-deleted order_items viewed through the same DataGrid
// plumbing as /works/production, with trashedMode flipped on.
const WorksTrashGrid = dynamic(() => import('@/components/works/WorksTrashGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function TrashPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <WorksTrashGrid />
    </div>
  )
}
