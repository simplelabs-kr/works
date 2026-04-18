import { redirect } from 'next/navigation'

// /works has no content of its own — every page lives under a sub-path
// (e.g. /works/production, /works/trash). Land on the default active
// page until the user navigates elsewhere.
export default function WorksIndexPage() {
  redirect('/works/production')
}
