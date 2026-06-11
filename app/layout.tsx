import type { Metadata } from 'next';
import {
  Bricolage_Grotesque,
  Hanken_Grotesk,
  Newsreader,
  Spline_Sans_Mono,
} from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-display',
});

const body = Hanken_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
});

const editorial = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-editorial',
});

const mono = Spline_Sans_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CaseForge — Case studies, in your client’s own voice',
  description:
    'Send one link. Your client answers three questions out loud — 90 seconds, no call. You get a finished case study: PDF, public page, and LinkedIn quotes.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${editorial.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-paper font-sans text-ink">
        {children}
      </body>
    </html>
  );
}
