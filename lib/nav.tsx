'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const on = (usePathname() || '').startsWith(href)
  return <Link href={href} className={`px-3 py-2 rounded whitespace-nowrap border-l-2 ${on ? 'bg-white/15 font-semibold border-belca-orange' : 'border-transparent hover:bg-white/10'}`}>{children}</Link>
}
