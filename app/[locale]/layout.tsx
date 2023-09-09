import "./globals.css";
import { Inter } from "next/font/google";
import { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { createTranslator, NextIntlClientProvider } from 'next-intl';

import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

type Props = {
  children: ReactNode;
  params: {locale: string};
};

async function getLocales(locale: string) {
  try {
    return (await import(`@/locales/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export async function generateMetadata({params: {locale}}: Props) {
  const messages = await getLocales(locale);

  const t = createTranslator({locale, messages});

  return {
    title: t('RootLayout.title'),
    description: t('RootLayout.description')
  };
}

export default async function RootLayout({
  children,
  params: {locale}
}: Props) {
  const messages = await getLocales(locale);

  return (
    <html lang={locale}>
      <body className={inter.className + "h-screen overflow-hidden"}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  );
}