import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'Belca Foodservice · Devoluciones',
  description: 'Gestión y seguimiento de devoluciones, canastas y recuperación económica.',
  robots: { index: false, follow: false },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body>{children}</body></html>
}
