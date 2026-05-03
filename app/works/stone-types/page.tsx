import dynamic from 'next/dynamic'

const StoneTypesGrid = dynamic(() => import('@/components/works/StoneTypesGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function StoneTypesPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <StoneTypesGrid />
    </div>
  )
}
