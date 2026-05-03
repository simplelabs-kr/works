import dynamic from 'next/dynamic'

const CastingInputsGrid = dynamic(() => import('@/components/works/CastingInputsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function CastingInputsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <CastingInputsGrid />
    </div>
  )
}
