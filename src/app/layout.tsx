import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationToastWrapper from "@/components/NotificationToastWrapper";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Writing Master",
  description: "Writingの練習ができるアプリケーション",
  icons: {
    icon: "/writing-webapp-icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <NotificationToastWrapper />
          </NotificationProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
