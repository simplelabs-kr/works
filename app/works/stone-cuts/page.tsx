import dynamic from 'next/dynamic'

const StoneCutsGrid = dynamic(() => import('@/components/works/StoneCutsGrid'), {
  ssr: false,
  loading: () => (
    <p className="py-8 text-center text-sm text-gray-400">로딩 중…</p>
  ),
})

export default function StoneCutsPage() {
  return (
    <div className="h-full min-h-0 overflow-hidden">
      <StoneCutsGrid />
    </div>
  )
}
