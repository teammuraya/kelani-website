import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import './globals.css';
import ConvexClientProvider from '@/components/ConvexClientProvider';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const dynamic = 'force-dynamic';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Kelani | Luxury Real Estate Development',
    template: '%s | Kelani',
  },
  description:
    'Luxury developments crafted for comfort, style, and effortless modern living across Kenya and East Africa.',
  keywords: [
    'Kelani',
    'luxury real estate',
    'Kenya real estate',
    'East Africa property',
    'luxury homes Kenya',
    'modern living',
    'real estate development',
    'luxury apartments',
    'Nairobi real estate',
  ],
  authors: [{ name: 'Kelani' }],
  creator: 'Kelani',
  icons: {
    icon: '/kelani_logo_(2).png',
    shortcut: '/kelani_logo_(2).png',
    apple: '/kelani_logo_(2).png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Kelani',
    title: 'Kelani | Luxury Real Estate Development',
    description:
      'Crafting exceptional living spaces across Kenya and East Africa. Where modern luxury meets intentional design.',
    images: [
      {
        url: '/kelani_logo_(2).png',
        width: 500,
        height: 500,
        alt: 'Kelani — Luxury Real Estate Development',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kelani | Luxury Real Estate Development',
    description:
      'Crafting exceptional living spaces across Kenya and East Africa. Where modern luxury meets intentional design.',
    images: ['/kelani_logo_(2).png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className="min-h-screen font-body antialiased">
        <ConvexClientProvider>
          <Navbar />
          {children}
          <Footer />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
