"use client"

import type React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LayoutProps {
  children: React.ReactNode
  hideFooter?: boolean
}

export default function Layout({ children, hideFooter }: LayoutProps) {
  const [sideMenuOpen, setSideMenuOpen] = useState(false)
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logout()
      router.push('/login')
    } catch (error) {
      console.error('Failed to log out:', error)
      alert('ログアウトに失敗しました')
    }
    setLogoutDialogOpen(false)
    setSideMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* グローバルヘッダー削除済み */}
      {/* <header className="border-b border-gray-200 bg-white"> ... </header> */}
      {sideMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setSideMenuOpen(false)} />
          <div className="ml-auto w-72 bg-white h-full shadow-lg p-6 relative flex flex-col">
            <button className="absolute top-4 right-4 p-2" onClick={() => setSideMenuOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <div className="mt-8 space-y-6">
              <Link href="/profile" className="block text-gray-700 hover:text-indigo-600 font-medium" onClick={() => setSideMenuOpen(false)}>
                プロフィール編集
              </Link>
              <Link href="/login" className="block text-gray-700 hover:text-indigo-600 font-medium" onClick={() => setSideMenuOpen(false)}>
                ログイン
              </Link>
              <button className="block text-left w-full text-gray-700 hover:text-indigo-600 font-medium" onClick={() => setLogoutDialogOpen(true)}>
                ログアウト
              </button>
            </div>
          </div>
        </div>
      )}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ログアウトの確認</DialogTitle>
            <DialogDescription>
              ログアウトしてもよろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              ログアウト
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <main>{children}</main>
      {!hideFooter && (
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-8 py-8 text-center">
            <p className="text-gray-500 text-sm">&copy; 2024 TOEFL iBT Writing Practice App. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  )
}
