import { RootProvider } from 'fumadocs-ui/provider/next';
import SearchDialog from '@/components/search';
import './global.css';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://docs.nextcrm.app'),
  title: { template: '%s | NextCRM docs', default: 'NextCRM docs' },
  description: 'Documentation for NextCRM, the open-source AI-first CRM.',
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider search={{ SearchDialog }}>{children}</RootProvider>
      </body>
    </html>
  );
}
