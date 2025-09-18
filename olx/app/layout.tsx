import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OLX Parser',
  description: 'OLX недвижимость парсер',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}