import dynamic from 'next/dynamic'

// 통합 휴지통 — order_items + products soft-deleted 레코드를 한 화면에서
// 보여주는 단순 리스트. 편집 UI가 필요 없으므로 DataGrid 재사용이 아닌
// 가벼운 커스텀 컴포넌트 경로로 구현한다.
const UnifiedTrashList = dynamic(() => import('@/components/trash/UnifiedTrashList'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function TrashPage() {
  return (
    <div className="h-full min-h-0 overflow-auto">
      <UnifiedTrashList />
    </div>
  )
}
