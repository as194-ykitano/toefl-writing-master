"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BookOpen, Menu, X } from "lucide-react"
import { useState } from "react"

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-7 h-7 bg-black rounded-md flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-medium text-gray-900">TOEFL Writing</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/tasks" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                演習
              </Link>
              <Link
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
              >
                ダッシュボード
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-all hover:scale-105">
                  ログイン
                </Button>
              </Link>
            </nav>

            <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-6 pb-6 border-t border-gray-200 pt-6">
              <nav className="space-y-4">
                <Link href="/tasks" className="block text-gray-600 hover:text-gray-900 text-sm font-medium">
                  演習
                </Link>
                <Link href="/dashboard" className="block text-gray-600 hover:text-gray-900 text-sm font-medium">
                  ダッシュボード
                </Link>
                <Link href="/login" className="block text-gray-600 hover:text-gray-900 text-sm font-medium">
                  ログイン
                </Link>
              </nav>
            </div>
          )}
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-8 py-8 text-center">
          <p className="text-gray-500 text-sm">&copy; 2024 TOEFL iBT Writing Practice App. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
