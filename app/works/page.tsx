import { redirect } from 'next/navigation'
import { getDefaultWorksPage } from '@/lib/nav/pages'

// /works has no content of its own — every page lives under a sub-path
// (e.g. /works/order-items, /works/trash). Land on the default active
// page from the registry so a new page added to pages.ts can become
// the landing target without editing this file.
export default function WorksIndexPage() {
  const target = getDefaultWorksPage()
  redirect(target.href!)
}
