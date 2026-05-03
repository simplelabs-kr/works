import dynamic from 'next/dynamic'

const ClaimsGrid = dynamic(() => import('@/components/works/ClaimsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function ClaimsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ClaimsGrid />
    </div>
  )
}
