import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChopTube - YouTube Drum Machine',
  description: 'Turn any YouTube video into a drum machine. Chop and play video segments like a DJ!',
  keywords: ['YouTube', 'drum machine', 'music', 'DJ', 'video chopping', 'sampling'],
  authors: [{ name: 'ChopTube' }],
  openGraph: {
    title: 'ChopTube - YouTube Drum Machine',
    description: 'Turn any YouTube video into a drum machine. Chop and play video segments like a DJ!',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}