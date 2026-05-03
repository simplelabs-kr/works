import dynamic from 'next/dynamic'

const ChainsGrid = dynamic(() => import('@/components/works/ChainsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function ChainsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <ChainsGrid />
    </div>
  )
}
