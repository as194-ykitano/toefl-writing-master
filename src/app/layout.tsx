import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ExamProvider } from "@/contexts/ExamContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationToastWrapper from "@/components/NotificationToastWrapper";
import { Toaster } from 'sonner';

// 初回描画前に <html> へ dark クラスを付け、テーマ切替時のちらつき（FOUC）を防ぐ。
// localStorage の選択を最優先し、未設定なら OS の配色設定に追従する。
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('prep_theme_v1');
    var isDark = stored ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

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
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <ExamProvider>
              <NotificationProvider>
                {children}
                <NotificationToastWrapper />
              </NotificationProvider>
            </ExamProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
