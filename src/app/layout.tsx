import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ExamProvider } from "@/contexts/ExamContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationToastWrapper from "@/components/NotificationToastWrapper";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prep Master — TOEFL / IELTS 4技能対策",
  description: "TOEFL / IELTS の4技能（Reading / Listening / Speaking / Writing）を練習・診断・復習できるアプリケーション",
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
          <ExamProvider>
            <NotificationProvider>
              {children}
              <NotificationToastWrapper />
            </NotificationProvider>
          </ExamProvider>
        </AuthProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
