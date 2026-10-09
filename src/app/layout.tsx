import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MojahidX Image Hosting - Fast, Resilient Storage Powered by GitHub & Vercel',
  description:
    'Production-ready image hosting web app with GitHub REST Contents API storage, Vercel Edge caching, magic-byte binary validation, and instant Markdown/HTML/Direct embeds.',
  keywords: [
    'image hosting',
    'mojahidx',
    'github storage',
    'vercel edge',
    'free image hosting',
    'markdown image host',
    'direct url',
  ],
  authors: [{ name: 'Mojahid' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#080613] text-zinc-100 font-sans selection:bg-purple-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
