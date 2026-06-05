import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/providers/ThemeProvider'
import FloatingChat from '@/components/chat/FloatingChat'
import { fullTitle } from '@/config/brand'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: fullTitle,
  description: 'Team onboarding and task management portal',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950`}>
        <ThemeProvider>
          {children}
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  )
}
