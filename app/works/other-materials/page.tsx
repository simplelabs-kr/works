import dynamic from 'next/dynamic'

const OtherMaterialsGrid = dynamic(() => import('@/components/works/OtherMaterialsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function OtherMaterialsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <OtherMaterialsGrid />
    </div>
  )
}
