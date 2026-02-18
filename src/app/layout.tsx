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
  title: 'Kelani | Luxury Real Estate Development',
  description:
    'Luxury developments crafted for comfort, style, and effortless modern living across Kenya and East Africa.',
  openGraph: {
    title: 'Kelani | Luxury Real Estate Development',
    description:
      'Crafting exceptional living spaces across Kenya and East Africa. Where modern luxury meets intentional design.',
    images: ['/kelani_logo_(2).png'],
  },
  twitter: {
    card: 'summary_large_image',
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
