import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}