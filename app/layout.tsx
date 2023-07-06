import { Inter } from "next/font/google";

import { ToastProvider } from "@/app/providers/ToastProvider";

import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "NextCRM",
  description: "",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ToastProvider />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
