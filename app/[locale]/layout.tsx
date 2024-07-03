import "./globals.css";

import { Metadata } from "next";
import { Inter } from "next/font/google";

import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createTranslator, NextIntlClientProvider } from "next-intl";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/app/providers/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

type Props = {
  children: ReactNode;
  params: { locale: string };
};

async function getLocales(locale: string) {
  try {
    return (await import(`@/locales/${locale}.json`)).default;
  } catch (error) {
    notFound();
  }
}

export async function generateMetadata({ params: { locale } }: Props) {
  const messages = await getLocales(locale);

  const t = createTranslator({ locale, messages });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
    title: t("RootLayout.title"),
    description: t("RootLayout.description"),
    openGraph: {
      images: [
        {
          url: "/images/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: t("RootLayout.title"),
        },
      ],
    },
    twitter: {
      cardType: "summary_large_image",
      image: "/images/opengraph-image.png",
      width: 1200,
      height: 630,
      alt: t("RootLayout.title"),
    },
  };
}

export default async function RootLayout({
  children,
  params: { locale },
}: Props) {
  const messages = await getLocales(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, height=device-height, initial-scale=1"
        />
        <meta property="og:url" content="https://www.windroseandco.com" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Windrose" />
        <meta
          property="og:description"
          content="Windrose is a cutting edge Client Management System. Built with Next JS using NextCRM, an open source SaaS builder. Technology stack: NextJS with Typescript, MongoDB, TailwindCSS, React, Prisma, shadCN, resend.com, react.email and more."
        />
      </head>
      <body className={inter.className + " h-screen overflow-hidden"}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
          </ThemeProvider>
        </NextIntlClientProvider>
        <Toaster />
        <SonnerToaster />
      </body>
    </html>
  );
}
